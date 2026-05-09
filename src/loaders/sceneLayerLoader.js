import { LinearFilter, Quaternion, SRGBColorSpace, Vector3, VideoTexture } from "three";
import { resolveAssetContract, resolveSceneLayers } from "./assetResolver.js";
import { disposeObjectTree } from "../utils/threeDisposal.js";

function logLayerMaterials(root, layer, enabled) {
  if (!enabled) {
    return;
  }

  const rows = [];
  root.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      rows.push({
        layer: layer.id,
        mesh: child.name || "(unnamed mesh)",
        material: material?.name || "(unnamed material)",
        tweak: material?.userData?.viewerTweakId || "",
      });
    });
  });
  console.table(rows);
}

async function loadProbesGlb({ viewerConfig, searchParams, assetQuery, gltfLoader, probeEnvironmentManager, updateStatus }) {
  if (!probeEnvironmentManager) {
    return;
  }

  const probesContract = resolveAssetContract(
    viewerConfig.assets.probes,
    searchParams,
    assetQuery,
  );

  if (!probesContract?.url) {
    return;
  }

  try {
    updateStatus(`Loading probes from ${probesContract.url}...`);
    const gltf = await gltfLoader(probesContract.url);
    probeEnvironmentManager.loadProbesFromGltf(gltf.scene);
    disposeObjectTree(gltf.scene);
    updateStatus(`Probes loaded from ${probesContract.url}.`);
  } catch (error) {
    console.warn(`Failed to load probes from ${probesContract.url}.`, error);
  }
}

export function createSceneLayerLoader({
  viewerConfig,
  searchParams,
  assetQuery = "",
  gltfLoader,
  sceneRoots,
  backgroundRoots,
  diagnosticsState,
  ensureReflectionEnvironment,
  convertMeshForLayer,
  matchesFireVideoTarget,
  getFallbackTextureChannel,
  applyTextureChannelOverride,
  applyFireVideoMaterialPatch,
  updateStatus,
  addFallbackScene,
  renderLayerControls,
  clearFallbackScene,
  applyBackgroundColorSettings,
  applySkyColorSettings = () => {},
  applyFireColorSettings,
  applyReflectMaterialSettings,
  applyRuntimeTextureOptimizations,
  updatePerformanceDiagnostics,
  positionCameraAtSpawn,
  applyCameraSettings,
  setLoadingScreenVisible,
  onLayersLoaded,
  isTouchDevice,
  isWalkMode,
  trackedMaterialSets = [],
  probeEnvironmentManager = null,
  setTranslucencySunDirection = null,
}) {
  const fxState = {
    activeLoadToken: null,
    playbackEnabled: true,
    videoUrl: null,
    videoElement: null,
    videoTexture: null,
    videoTexturePromise: null,
    lastResumeAttemptAt: 0,
    resumePlayPromise: null,
  };
  const imageBitmapBypassState = {
    activeCount: 0,
    originalCreateImageBitmap: null,
  };
  const VIDEO_READY_STATE_CURRENT_DATA = 2;

  function mountHiddenVideoElement(video) {
    const host = document.body ?? document.documentElement;
    if (!host?.appendChild) {
      return;
    }

    video.controls = false;
    video.disablePictureInPicture = true;
    video.style.position = "fixed";
    video.style.left = "-9999px";
    video.style.top = "-9999px";
    video.style.width = "1px";
    video.style.height = "1px";
    video.style.opacity = "0";
    video.style.pointerEvents = "none";
    video.style.zIndex = "-1";
    host.appendChild(video);
  }

  function isFireVideoReady(video) {
    return Number(video.readyState ?? 0) >= VIDEO_READY_STATE_CURRENT_DATA
      || (video.videoWidth ?? 0) > 0;
  }

  function attemptFireVideoPlayback(video) {
    const playPromise = video.play?.();
    if (!playPromise?.catch) {
      return Promise.resolve();
    }

    return playPromise.catch(() => {
      // Muted autoplay can still be blocked or deferred; runtime retries handle that path.
    });
  }

  function waitForFireVideoReady(video, videoUrl) {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", handleReady);
        video.removeEventListener("loadeddata", handleReady);
        video.removeEventListener("canplay", handleReady);
        video.removeEventListener("error", handleError);
      };
      const handleReady = () => {
        if (!isFireVideoReady(video)) {
          return;
        }

        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error(`Failed to load fire video from ${videoUrl}.`));
      };

      if (isFireVideoReady(video)) {
        resolve();
        return;
      }

      video.addEventListener("loadedmetadata", handleReady);
      video.addEventListener("loadeddata", handleReady);
      video.addEventListener("canplay", handleReady);
      video.addEventListener("error", handleError);
      video.load();
    });
  }

  function shouldBypassImageBitmapForGltf() {
    if (typeof navigator === "undefined" || typeof globalThis.createImageBitmap !== "function") {
      return false;
    }

    return navigator.userAgent.includes("Firefox");
  }

  async function loadGltfScene(url) {
    if (!shouldBypassImageBitmapForGltf()) {
      return gltfLoader.loadAsync(url);
    }

    if (imageBitmapBypassState.activeCount === 0) {
      imageBitmapBypassState.originalCreateImageBitmap = globalThis.createImageBitmap;
      try {
        globalThis.createImageBitmap = undefined;
      } catch {
        return gltfLoader.loadAsync(url);
      }
    }

    imageBitmapBypassState.activeCount += 1;

    try {
      return await gltfLoader.loadAsync(url);
    } finally {
      imageBitmapBypassState.activeCount = Math.max(0, imageBitmapBypassState.activeCount - 1);
      if (imageBitmapBypassState.activeCount === 0) {
        try {
          globalThis.createImageBitmap = imageBitmapBypassState.originalCreateImageBitmap;
        } catch {
          // Ignore environments that don't allow restoring this global.
        }
        imageBitmapBypassState.originalCreateImageBitmap = null;
      }
    }
  }

  function cleanupLoadedRoots(loadedLayers = []) {
    const seenGeometries = new Set();
    const seenMaterials = new Set();
    const seenTextures = new Set();

    loadedLayers.forEach(({ root }) => {
      if (!root) {
        return;
      }

      backgroundRoots.delete(root);
      disposeObjectTree(root, {
        trackedMaterialSets,
        seenGeometries,
        seenMaterials,
        seenTextures,
      });
    });
  }

  function disposeFireVideoResources() {
    fxState.activeLoadToken = null;
    fxState.playbackEnabled = true;
    fxState.videoTexture?.dispose();

    if (fxState.videoElement) {
      fxState.videoElement.pause();
      fxState.videoElement.removeAttribute("src");
      fxState.videoElement.load();
      fxState.videoElement.remove();
    }

    fxState.videoUrl = null;
    fxState.videoElement = null;
    fxState.videoTexture = null;
    fxState.videoTexturePromise = null;
    fxState.lastResumeAttemptAt = 0;
    fxState.resumePlayPromise = null;
  }

  function beginDeferredFireVideoLoad(root, loadToken) {
    ensureFireVideoTexture()
      .then((fireVideoTexture) => {
        if (!fireVideoTexture || fxState.activeLoadToken !== loadToken) {
          return;
        }

        applyFxRuntimeAssets(root, fireVideoTexture);
        applyFireColorSettings();
      })
      .catch((error) => {
        if (fxState.activeLoadToken !== loadToken) {
          return;
        }

        console.warn(`Deferred fire video failed to load from ${fxState.videoUrl}.`, error);
      });
  }

  async function ensureFireVideoTexture() {
    if (fxState.videoTexture) {
      return fxState.videoTexture;
    }

    if (fxState.videoTexturePromise) {
      return fxState.videoTexturePromise;
    }

    fxState.videoTexturePromise = (async () => {
      if (!fxState.videoUrl) {
        fxState.videoUrl = resolveAssetContract(
          viewerConfig.assets.fireVideo,
          searchParams,
          assetQuery,
        ).url;
      }

      if (!fxState.videoUrl) {
        return null;
      }

      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.loop = true;
      video.autoplay = true;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.setAttribute("autoplay", "");
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      mountHiddenVideoElement(video);
      video.src = fxState.videoUrl;

      const readyPromise = waitForFireVideoReady(video, fxState.videoUrl);
      if (fxState.playbackEnabled) {
        attemptFireVideoPlayback(video);
      }
      await readyPromise;

      const texture = new VideoTexture(video);
      texture.colorSpace = SRGBColorSpace;
      texture.flipY = false;
      texture.generateMipmaps = false;
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
      texture.needsUpdate = true;

      fxState.videoElement = video;
      fxState.videoTexture = texture;

      if (fxState.playbackEnabled) {
        await attemptFireVideoPlayback(video);
      }

      return texture;
    })();

    try {
      return await fxState.videoTexturePromise;
    } catch (error) {
      fxState.videoTexturePromise = null;
      throw error;
    }
  }

  async function loadLayer(layer, loadToken) {
    let root = null;

    try {
      updateStatus(`Loading ${layer.label} layer from ${layer.url}...`);
      const gltf = await loadGltfScene(layer.url);
      root = gltf.scene;
      root.name = root.name || `${layer.id}-root`;
      root.userData.viewerLayerId = layer.id;

      if (layer.materialMode === "alphaCutout" && setTranslucencySunDirection) {
        root.updateMatrixWorld(true);
        const sunNode = root.getObjectByName("Sun");
        if (sunNode) {
          const forward = new Vector3(0, 0, -1);
          const worldQuaternion = new Quaternion();
          sunNode.getWorldQuaternion(worldQuaternion);
          forward.applyQuaternion(worldQuaternion).normalize();
          setTranslucencySunDirection(forward);
          sunNode.removeFromParent();
        }
      }

      root.traverse((child) => {
        if (child.isMesh) {
          child.userData.viewerLayerId = layer.id;
          convertMeshForLayer(child, layer.materialMode);
        }
      });

      if (layer.runtime?.applyFireVideoTexture) {
        if (fxState.videoTexture) {
          applyFxRuntimeAssets(root, fxState.videoTexture);
        } else {
          beginDeferredFireVideoLoad(root, loadToken);
        }
      }

      if (layer.runtime?.registerAsBackgroundRoot) {
        backgroundRoots.add(root);
      }

      logLayerMaterials(root, layer, viewerConfig.debug.logMaterialTargets);
      sceneRoots.add(root);
      return { layer, root };
    } catch (error) {
      if (root) {
        cleanupLoadedRoots([{ root }]);
      }

      throw error;
    }
  }

  function applyFxRuntimeAssets(root, fireVideoTexture = fxState.videoTexture) {
    if (!fireVideoTexture) {
      return 0;
    }

    let patchedMaterials = 0;
    root.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (!material?.isMaterial || !matchesFireVideoTarget(child, material)) {
          return;
        }

        const colorChannel = getFallbackTextureChannel(
          child,
          viewerConfig.materialPresets.fxUvChannels.color,
        );

        material.map = fireVideoTexture;
        applyTextureChannelOverride(material.map, colorChannel);
        material.transparent = true;
        material.alphaTest = Math.min(material.alphaTest || viewerConfig.materialPresets.fxAlphaCutoff, 0.02);
        applyFireVideoMaterialPatch(material);
        material.needsUpdate = true;
        patchedMaterials += 1;
      });
    });

    return patchedMaterials;
  }

  function resumeFireVideoPlayback() {
    if (!fxState.playbackEnabled || !fxState.videoElement || !fxState.videoElement.paused || fxState.resumePlayPromise) {
      return fxState.resumePlayPromise ?? null;
    }

    fxState.lastResumeAttemptAt = performance.now();
    fxState.resumePlayPromise = fxState.videoElement.play()
      .catch(() => {
        // Ignore user-gesture playback failures.
      })
      .finally(() => {
        fxState.resumePlayPromise = null;
      });

    return fxState.resumePlayPromise;
  }

  function syncFireVideoPlayback() {
    if (
      fxState.playbackEnabled
      && fxState.videoElement?.paused
      && performance.now() - fxState.lastResumeAttemptAt > 1500
    ) {
      resumeFireVideoPlayback();
    }
  }

  function setFireVideoPlaybackEnabled(enabled) {
    fxState.playbackEnabled = enabled;

    if (!fxState.videoElement) {
      return null;
    }

    if (enabled) {
      return resumeFireVideoPlayback();
    }

    fxState.videoElement.pause();
    return null;
  }

  async function loadSceneLayers() {
    const loadedLayers = [];
    const loadToken = Symbol("scene-load");
    try {
      fxState.activeLoadToken = loadToken;
      cleanupLoadedRoots(diagnosticsState.loadedLayers);
      diagnosticsState.loadedLayers = [];
      disposeFireVideoResources();
      fxState.activeLoadToken = loadToken;
      clearFallbackScene();
      await loadProbesGlb({
        viewerConfig,
        searchParams,
        assetQuery,
        gltfLoader: loadGltfScene,
        probeEnvironmentManager,
        updateStatus,
      });
      if (!probeEnvironmentManager?.hasProbes()) {
        await ensureReflectionEnvironment();
      }
      const layers = resolveSceneLayers(viewerConfig.sceneLayers, searchParams, assetQuery);
      if (!layers?.length) {
        addFallbackScene();
        return;
      }

      const requiredLayers = layers.filter((layer) => layer.required);
      const optionalLayers = layers.filter((layer) => !layer.required);

      const requiredResults = await Promise.allSettled(requiredLayers.map((layer) => loadLayer(layer, loadToken)));
      const requiredFailure = requiredResults.find((result) => result.status === "rejected");
      if (requiredFailure) {
        throw requiredFailure.reason;
      }

      loadedLayers.push(
        ...requiredResults
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value),
      );

      const optionalResults = await Promise.allSettled(optionalLayers.map((layer) => loadLayer(layer, loadToken)));
      optionalResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          loadedLayers.push(result.value);
          return;
        }

        const layer = optionalLayers[index];
        console.warn(`Optional layer "${layer.id}" failed to load from ${layer.url}.`, result.reason);
      });

      if (!loadedLayers.length) {
        addFallbackScene();
        return;
      }

      diagnosticsState.loadedLayers = loadedLayers;
      renderLayerControls();
      applyBackgroundColorSettings();
      applySkyColorSettings();
      applyFireColorSettings();
      applyReflectMaterialSettings();
      applyRuntimeTextureOptimizations();
      updatePerformanceDiagnostics();
      onLayersLoaded?.(loadedLayers);

      const spawnRoot = loadedLayers.find((entry) => entry.layer.runtime?.preferAsSpawnRoot)?.root
        ?? loadedLayers[0].root;
      positionCameraAtSpawn(spawnRoot, loadedLayers);
      applyCameraSettings();

      const loadedSummary = loadedLayers.map((entry) => entry.layer.label).join(", ");
      updateStatus(isTouchDevice
        ? `Loaded layers: ${loadedSummary}. Use joystick and look pad to ${isWalkMode ? "walk" : "fly"}.`
        : `Loaded layers: ${loadedSummary}. Click to lock mouse and ${isWalkMode ? "walk" : "fly"}.`);
      setLoadingScreenVisible(false);
    } catch (error) {
      fxState.activeLoadToken = null;
      console.error("Scene load failed.", error);
      cleanupLoadedRoots(loadedLayers);
      disposeFireVideoResources();
      diagnosticsState.loadedLayers = [];
      renderLayerControls();
      addFallbackScene();
      updateStatus("Scene load failed. Check browser console and your exported asset paths.");
      setLoadingScreenVisible(false);
    }
  }

  function dispose() {
    fxState.activeLoadToken = null;
    cleanupLoadedRoots(diagnosticsState.loadedLayers);
    diagnosticsState.loadedLayers = [];
    clearFallbackScene();
    disposeFireVideoResources();
  }

  return {
    dispose,
    loadSceneLayers,
    resumeFireVideoPlayback,
    setFireVideoPlaybackEnabled,
    syncFireVideoPlayback,
  };
}

import * as THREE from "three";
import { resolveOptionalAssetUrl, resolveSceneLayers } from "./assetResolver.js";

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
  applyBackgroundColorSettings,
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
}) {
  const fxState = {
    videoUrl: null,
    videoElement: null,
    videoTexture: null,
    lastResumeAttemptAt: 0,
  };

  function cleanupLoadedRoots(loadedLayers = []) {
    loadedLayers.forEach(({ root }) => {
      if (!root) {
        return;
      }

      backgroundRoots.delete(root);
      if (root.parent) {
        root.parent.remove(root);
      }
    });
  }

  async function ensureFireVideoTexture() {
    if (fxState.videoTexture) {
      return fxState.videoTexture;
    }

    if (!fxState.videoUrl) {
      fxState.videoUrl = resolveOptionalAssetUrl(
        searchParams,
        viewerConfig.materialPresets.fireVideo.searchParam,
        viewerConfig.materialPresets.fireVideo.url,
        assetQuery,
      );
    }

    if (!fxState.videoUrl) {
      return null;
    }

    const video = document.createElement("video");
    video.src = fxState.videoUrl;
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

    await new Promise((resolve, reject) => {
      const cleanup = () => {
        video.removeEventListener("loadeddata", handleLoaded);
        video.removeEventListener("error", handleError);
      };
      const handleLoaded = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error(`Failed to load fire video from ${fxState.videoUrl}.`));
      };

      video.addEventListener("loadeddata", handleLoaded);
      video.addEventListener("error", handleError);
      video.load();
    });

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    fxState.videoElement = video;
    fxState.videoTexture = texture;

    try {
      await video.play();
    } catch {
      // Autoplay can be blocked until a user gesture; we'll retry on click/lock.
    }

    return texture;
  }

  async function applyFxRuntimeAssets(root) {
    const fireVideoTexture = await ensureFireVideoTexture();
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
    if (!fxState.videoElement || !fxState.videoElement.paused) {
      return;
    }

    fxState.lastResumeAttemptAt = performance.now();
    fxState.videoElement.play().catch(() => {
      // Ignore user-gesture playback failures.
    });
  }

  function syncFireVideoPlayback() {
    if (fxState.videoElement?.paused && performance.now() - fxState.lastResumeAttemptAt > 1500) {
      resumeFireVideoPlayback();
    }
  }

  async function loadSceneLayers() {
    const loadedLayers = [];
    try {
      await ensureReflectionEnvironment();
      const layers = resolveSceneLayers(viewerConfig.sceneLayers, searchParams, assetQuery);
      if (!layers?.length) {
        addFallbackScene();
        return;
      }

      const prioritizedLayers = [
        ...layers.filter((layer) => layer.required),
        ...layers.filter((layer) => !layer.required),
      ];

      for (const layer of prioritizedLayers) {
        try {
          updateStatus(`Loading ${layer.label} layer from ${layer.url}...`);
          const gltf = await gltfLoader.loadAsync(layer.url);
          const root = gltf.scene;
          root.name = root.name || `${layer.id}-root`;
          root.userData.viewerLayerId = layer.id;

          root.traverse((child) => {
            if (child.isMesh) {
              child.userData.viewerLayerId = layer.id;
              convertMeshForLayer(child, layer.materialMode);
            }
          });

          if (layer.id === "fx") {
            await applyFxRuntimeAssets(root);
          }

          if (layer.id === "background") {
            backgroundRoots.add(root);
          }

          logLayerMaterials(root, layer, viewerConfig.debug.logMaterialTargets);
          sceneRoots.add(root);
          loadedLayers.push({ layer, root });
        } catch (error) {
          if (layer.required) {
            throw error;
          }

          console.warn(`Optional layer "${layer.id}" failed to load from ${layer.url}.`, error);
        }
      }

      if (!loadedLayers.length) {
        addFallbackScene();
        return;
      }

      diagnosticsState.loadedLayers = loadedLayers;
      renderLayerControls();
      applyBackgroundColorSettings();
      applyFireColorSettings();
      applyReflectMaterialSettings();
      applyRuntimeTextureOptimizations();
      updatePerformanceDiagnostics();
      onLayersLoaded?.(loadedLayers);

      const spawnRoot = loadedLayers.find((entry) => entry.layer.id === "base")?.root ?? loadedLayers[0].root;
      positionCameraAtSpawn(spawnRoot);
      applyCameraSettings();

      const loadedSummary = loadedLayers.map((entry) => entry.layer.label).join(", ");
      updateStatus(isTouchDevice
        ? `Loaded layers: ${loadedSummary}. Use joystick and look pad to ${isWalkMode ? "walk" : "fly"}.`
        : `Loaded layers: ${loadedSummary}. Click to lock mouse and ${isWalkMode ? "walk" : "fly"}.`);
      setLoadingScreenVisible(false);
    } catch (error) {
      console.error(error);
      cleanupLoadedRoots(loadedLayers);
      diagnosticsState.loadedLayers = [];
      renderLayerControls();
      addFallbackScene();
      updateStatus("Scene load failed. Check browser console and your exported asset paths.");
      setLoadingScreenVisible(false);
    }
  }

  return {
    loadSceneLayers,
    resumeFireVideoPlayback,
    syncFireVideoPlayback,
  };
}

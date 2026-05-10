import test from "node:test";
import assert from "node:assert/strict";
import { BufferGeometry, Group, Mesh, MeshBasicMaterial } from "three";

import { createSceneLayerLoader } from "../src/loaders/sceneLayerLoader.js";

function flushMicrotasks() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

test("createSceneLayerLoader does not block scene readiness on deferred fire video", async () => {
  const sceneRoots = new Group();
  const diagnosticsState = {
    loadedLayers: [],
  };
  const callLog = [];
  let resolveVideoReady;
  const originalDocument = globalThis.document;

  globalThis.document = {
    body: {
      appendChild() {},
    },
    createElement(tagName) {
      assert.equal(tagName, "video");
      const video = {
        src: "",
        crossOrigin: "",
        loop: false,
        autoplay: false,
        muted: false,
        defaultMuted: false,
        playsInline: false,
        preload: "",
        controls: true,
        disablePictureInPicture: false,
        style: {},
        paused: true,
        readyState: 0,
        videoWidth: 0,
        setAttribute() {},
        removeAttribute() {},
        remove() {},
        pause() {},
        load() {},
        play() {
          this.paused = false;
          return Promise.resolve();
        },
        addEventListener(eventName, handler) {
          if (["loadedmetadata", "loadeddata", "canplay"].includes(eventName)) {
            resolveVideoReady = () => {
              video.readyState = 2;
              video.videoWidth = 1920;
              handler();
            };
          }
        },
        removeEventListener() {},
      };
      return video;
    },
  };

  const loader = createSceneLayerLoader({
    viewerConfig: {
      assets: {
        probes: { url: "" },
        fireVideo: { url: "/assets/scene/fire.mp4" },
      },
      sceneLayers: [
        {
          id: "base",
          label: "Base",
          url: "/assets/scene/scene.glb",
          required: true,
          materialMode: "baked",
          runtime: {
            preferAsSpawnRoot: true,
          },
        },
        {
          id: "fire",
          label: "Fire",
          url: "/assets/scene/fire.glb",
          required: false,
          materialMode: "fx",
          runtime: {
            applyFireVideoTexture: true,
          },
        },
      ],
      debug: {
        logMaterialTargets: false,
      },
      materialPresets: {
        fxUvChannels: {
          color: 0,
        },
      },
    },
    searchParams: new URLSearchParams("scene=%2Fassets%2Fscene%2Fscene.glb&fire=%2Fassets%2Fscene%2Ffire.glb"),
    gltfLoader: {
      loadAsync: async (url) => {
        const root = Object.assign(new Group(), {
          name: url.includes("fire") ? "fire-root" : "base-root",
        });
        if (url.includes("fire")) {
          root.add(new Mesh(new BufferGeometry(), new MeshBasicMaterial({ name: "fire-material" })));
        }
        return { scene: root };
      },
    },
    sceneRoots,
    backgroundRoots: new Set(),
    diagnosticsState,
    ensureReflectionEnvironment: async () => {},
    convertMeshForLayer() {},
    matchesFireVideoTarget() {
      return true;
    },
    getFallbackTextureChannel() {
      return 0;
    },
    applyTextureChannelOverride() {},
    applyFireVideoMaterialPatch() {
      callLog.push("apply-patch");
    },
    updateStatus() {},
    addFallbackScene() {},
    renderLayerControls() {},
    clearFallbackScene() {},
    applyBackgroundColorSettings() {},
    applyFireColorSettings() {
      callLog.push("apply-fire-color");
    },
    applyReflectMaterialSettings() {},
    applyRuntimeTextureOptimizations() {
      callLog.push("runtime-opt");
    },
    updatePerformanceDiagnostics() {
      callLog.push("diagnostics");
    },
    positionCameraAtSpawn() {
      callLog.push("spawn");
    },
    applyCameraSettings() {
      callLog.push("camera");
    },
    setLoadingScreenVisible(visible) {
      callLog.push(`loading:${visible}`);
    },
    onLayersLoaded(loadedLayers) {
      callLog.push(`loaded:${loadedLayers.length}`);
    },
    isTouchDevice: false,
    isWalkMode: true,
  });

  try {
    await loader.loadSceneLayers();

    assert.ok(callLog.includes("runtime-opt"));
    assert.ok(callLog.includes("diagnostics"));
    assert.ok(callLog.includes("loaded:2"));
    assert.ok(callLog.includes("spawn"));
    assert.ok(callLog.includes("camera"));
    assert.ok(callLog.includes("loading:false"));
    assert.equal(callLog.includes("apply-patch"), false);

    resolveVideoReady();
    await flushMicrotasks();

    assert.equal(callLog.includes("apply-patch"), true);
    assert.equal(callLog.includes("apply-fire-color"), true);
  } finally {
    globalThis.document = originalDocument;
  }
});

test("createSceneLayerLoader skips excluded optional layers", async () => {
  const diagnosticsState = {
    loadedLayers: [],
  };
  const loadedUrls = [];

  const loader = createSceneLayerLoader({
    viewerConfig: {
      assets: {
        probes: { url: "" },
        fireVideo: { url: "/assets/scene/fire.mp4" },
      },
      sceneLayers: [
        {
          id: "base",
          label: "Base",
          url: "/assets/scene/scene.glb",
          required: true,
          materialMode: "baked",
          runtime: {
            preferAsSpawnRoot: true,
          },
        },
        {
          id: "glass",
          label: "Glass",
          url: "/assets/scene/glass.glb",
          required: false,
          materialMode: "glass",
        },
        {
          id: "emissive",
          label: "Emissive",
          url: "/assets/scene/emissive.glb",
          required: false,
          materialMode: "emissive",
        },
      ],
      debug: {
        logMaterialTargets: false,
      },
      materialPresets: {
        fxUvChannels: {
          color: 0,
        },
      },
    },
    searchParams: new URLSearchParams(),
    gltfLoader: {
      loadAsync: async (url) => {
        loadedUrls.push(url);
        return { scene: new Group() };
      },
    },
    sceneRoots: new Group(),
    backgroundRoots: new Set(),
    diagnosticsState,
    ensureReflectionEnvironment: async () => {},
    convertMeshForLayer() {},
    matchesFireVideoTarget() {
      return false;
    },
    getFallbackTextureChannel() {
      return 0;
    },
    applyTextureChannelOverride() {},
    applyFireVideoMaterialPatch() {},
    updateStatus() {},
    addFallbackScene() {},
    renderLayerControls() {},
    clearFallbackScene() {},
    applyBackgroundColorSettings() {},
    applyFireColorSettings() {},
    applyReflectMaterialSettings() {},
    applyRuntimeTextureOptimizations() {},
    updatePerformanceDiagnostics() {},
    positionCameraAtSpawn() {},
    applyCameraSettings() {},
    setLoadingScreenVisible() {},
    excludeLayerIds: ["glass"],
    onLayersLoaded() {},
    isTouchDevice: false,
    isWalkMode: true,
  });

  await loader.loadSceneLayers();

  assert.deepEqual(loadedUrls, [
    "/assets/scene/scene.glb",
    "/assets/scene/emissive.glb",
  ]);
  assert.equal(diagnosticsState.loadedLayers.length, 2);
});

test("createSceneLayerLoader skips reflection environment setup for baked-only loads", async () => {
  const diagnosticsState = {
    loadedLayers: [],
  };
  let ensureReflectionCalls = 0;
  let probeLoadAttempts = 0;

  const loader = createSceneLayerLoader({
    viewerConfig: {
      assets: {
        probes: { url: "/assets/scene/probes.glb" },
        fireVideo: { url: "/assets/scene/fire.mp4" },
      },
      sceneLayers: [
        {
          id: "base",
          label: "Base",
          url: "/assets/scene/scene.glb",
          required: true,
          materialMode: "baked",
          runtime: {
            preferAsSpawnRoot: true,
          },
        },
        {
          id: "glass",
          label: "Glass",
          url: "/assets/scene/glass.glb",
          required: false,
          materialMode: "glass",
        },
      ],
      debug: {
        logMaterialTargets: false,
      },
      materialPresets: {
        fxUvChannels: {
          color: 0,
        },
      },
    },
    searchParams: new URLSearchParams(),
    gltfLoader: {
      loadAsync: async (url) => {
        if (url.includes("probes")) {
          probeLoadAttempts += 1;
        }
        return { scene: new Group() };
      },
    },
    sceneRoots: new Group(),
    backgroundRoots: new Set(),
    diagnosticsState,
    ensureReflectionEnvironment: async () => {
      ensureReflectionCalls += 1;
    },
    convertMeshForLayer() {},
    matchesFireVideoTarget() {
      return false;
    },
    getFallbackTextureChannel() {
      return 0;
    },
    applyTextureChannelOverride() {},
    applyFireVideoMaterialPatch() {},
    updateStatus() {},
    addFallbackScene() {},
    renderLayerControls() {},
    clearFallbackScene() {},
    applyBackgroundColorSettings() {},
    applyFireColorSettings() {},
    applyReflectMaterialSettings() {},
    applyRuntimeTextureOptimizations() {},
    updatePerformanceDiagnostics() {},
    positionCameraAtSpawn() {},
    applyCameraSettings() {},
    setLoadingScreenVisible() {},
    requiredLayersOnly: true,
    disableProbeLoad: false,
    probeEnvironmentManager: {
      hasProbes() {
        return false;
      },
      loadProbesFromGltf() {},
    },
    onLayersLoaded() {},
    isTouchDevice: false,
    isWalkMode: true,
  });

  await loader.loadSceneLayers();

  assert.equal(ensureReflectionCalls, 0);
  assert.equal(probeLoadAttempts, 0);
  assert.equal(diagnosticsState.loadedLayers.length, 1);
});

test("createSceneLayerLoader can eagerly load an explicit included optional layer", async () => {
  const diagnosticsState = {
    loadedLayers: [],
  };
  const loadedUrls = [];

  const loader = createSceneLayerLoader({
    viewerConfig: {
      assets: {
        probes: { url: "/assets/scene/probes.glb" },
        fireVideo: { url: "/assets/scene/fire.mp4" },
      },
      sceneLayers: [
        {
          id: "base",
          label: "Base",
          url: "/assets/scene/scene.glb",
          required: true,
          materialMode: "baked",
          runtime: {
            preferAsSpawnRoot: true,
          },
        },
        {
          id: "reflect",
          label: "Reflect",
          url: "/assets/scene/reflect.glb",
          required: false,
          materialMode: "reflect",
        },
        {
          id: "glass",
          label: "Glass",
          url: "/assets/scene/glass.glb",
          required: false,
          materialMode: "glass",
        },
      ],
      debug: {
        logMaterialTargets: false,
      },
      materialPresets: {
        fxUvChannels: {
          color: 0,
        },
      },
    },
    searchParams: new URLSearchParams(),
    gltfLoader: {
      loadAsync: async (url) => {
        loadedUrls.push(url);
        return { scene: new Group() };
      },
    },
    sceneRoots: new Group(),
    backgroundRoots: new Set(),
    diagnosticsState,
    ensureReflectionEnvironment: async () => {},
    convertMeshForLayer() {},
    matchesFireVideoTarget() {
      return false;
    },
    getFallbackTextureChannel() {
      return 0;
    },
    applyTextureChannelOverride() {},
    applyFireVideoMaterialPatch() {},
    updateStatus() {},
    addFallbackScene() {},
    renderLayerControls() {},
    clearFallbackScene() {},
    applyBackgroundColorSettings() {},
    applyFireColorSettings() {},
    applyReflectMaterialSettings() {},
    applyRuntimeTextureOptimizations() {},
    updatePerformanceDiagnostics() {},
    positionCameraAtSpawn() {},
    applyCameraSettings() {},
    setLoadingScreenVisible() {},
    includeLayerIds: ["base", "reflect"],
    onLayersLoaded() {},
    isTouchDevice: false,
    isWalkMode: true,
  });

  await loader.loadSceneLayers();

  assert.deepEqual(loadedUrls, [
    "/assets/scene/scene.glb",
    "/assets/scene/reflect.glb",
  ]);
  assert.equal(diagnosticsState.loadedLayers.length, 2);
});

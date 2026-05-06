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
  let resolveVideoLoad;
  const originalDocument = globalThis.document;

  globalThis.document = {
    createElement(tagName) {
      assert.equal(tagName, "video");
      return {
        src: "",
        crossOrigin: "",
        loop: false,
        autoplay: false,
        muted: false,
        defaultMuted: false,
        playsInline: false,
        preload: "",
        paused: true,
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
          if (eventName === "loadeddata") {
            resolveVideoLoad = () => handler();
          }
        },
        removeEventListener() {},
      };
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

    resolveVideoLoad();
    await flushMicrotasks();

    assert.equal(callLog.includes("apply-patch"), true);
    assert.equal(callLog.includes("apply-fire-color"), true);
  } finally {
    globalThis.document = originalDocument;
  }
});

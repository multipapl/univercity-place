import test from "node:test";
import assert from "node:assert/strict";
import { BufferGeometry, Group, Mesh, MeshBasicMaterial } from "three";

import { createSceneLayerLoader } from "../src/loaders/sceneLayerLoader.js";

test("createSceneLayerLoader captures Sun direction for alpha cutout layers and removes the helper node", async () => {
  const sceneRoots = new Group();
  const diagnosticsState = {
    loadedLayers: [],
  };
  const sunDirections = [];

  const loader = createSceneLayerLoader({
    viewerConfig: {
      assets: {
        probes: { url: "" },
      },
      sceneLayers: [
        {
          id: "alpha",
          label: "Alpha",
          url: "/assets/scene/translucent.glb",
          required: true,
          materialMode: "alphaCutout",
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
      loadAsync: async () => {
        const root = new Group();
        const sun = new Group();
        sun.name = "Sun";
        root.add(sun);
        root.add(new Mesh(new BufferGeometry(), new MeshBasicMaterial({ name: "leaf" })));
        return { scene: root };
      },
    },
    sceneRoots,
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
    onLayersLoaded() {},
    isTouchDevice: false,
    isWalkMode: true,
    setTranslucencySunDirection(direction) {
      sunDirections.push(direction.clone());
    },
  });

  await loader.loadSceneLayers();

  assert.equal(sunDirections.length, 1);
  assert.deepEqual(
    sunDirections[0].toArray().map((value) => Number(value.toFixed(4))),
    [0, 0, -1],
  );
  assert.equal(diagnosticsState.loadedLayers.length, 1);
  assert.equal(diagnosticsState.loadedLayers[0].root.getObjectByName("Sun"), undefined);
});

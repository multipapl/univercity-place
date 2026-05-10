import test from "node:test";
import assert from "node:assert/strict";

import { Group, Mesh, MeshBasicMaterial, BufferGeometry } from "three";
import { createDebugObjectInspector } from "../src/debug/debugObjectInspector.js";

test("debug object inspector loads and applies saved overrides even when debug mode is disabled", async () => {
  const originalFetch = globalThis.fetch;
  const appliedOverrides = [];

  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        version: 1,
        targets: [
          {
            layerId: "base",
            meshName: "Door",
            meshPath: "",
            materialName: "DoorMat",
            materialSlot: 0,
            hue: 12,
            saturation: 0.9,
            value: 1.08,
            gamma: 1.15,
          },
        ],
      };
    },
  });

  try {
    const root = new Group();
    const material = new MeshBasicMaterial({ name: "DoorMat" });
    const mesh = new Mesh(new BufferGeometry(), material);
    mesh.name = "Door";
    mesh.userData.viewerLayerId = "base";
    root.add(mesh);

    const inspector = createDebugObjectInspector({
      enabled: false,
      isDev: false,
      assetQuery: "",
      camera: {},
      sceneRoots: root,
      rendererDomElement: {
        getBoundingClientRect() {
          return { left: 0, top: 0, width: 1, height: 1 };
        },
      },
      materialPipeline: {
        describeMaterialTarget(targetMesh, targetMaterial, materialIndex) {
          return {
            layerId: targetMesh.userData.viewerLayerId,
            meshName: targetMesh.name,
            meshPath: "",
            materialName: targetMaterial.name,
            materialSlot: materialIndex,
          };
        },
        canApplyDebugColorCorrection() {
          return true;
        },
        applyDebugColorCorrection(targetMaterial, override) {
          appliedOverrides.push({ targetMaterial, override });
        },
        clearDebugColorCorrection() {},
      },
      updateStatus() {},
      getMenuOpen: () => false,
      requestRender: () => {},
      ui: {},
    });

    inspector.setLoadedLayers([{ root }]);
    await inspector.loadOverrides();

    assert.equal(appliedOverrides.length, 1);
    assert.equal(appliedOverrides[0].targetMaterial, material);
    assert.deepEqual(appliedOverrides[0].override, {
      layerId: "base",
      meshName: "Door",
      meshPath: "",
      materialName: "DoorMat",
      materialSlot: 0,
      hue: 12,
      saturation: 0.9,
      value: 1.08,
      gamma: 1.15,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

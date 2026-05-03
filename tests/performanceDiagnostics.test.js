import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";

import { createPerformanceDiagnostics } from "../src/diagnostics/performanceDiagnostics.js";

function createTextNode() {
  return { textContent: "" };
}

function createIndexedTriangleGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 0, 0,
    1, 0, 0,
    1, 1, 0,
    0, 1, 0,
  ], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  return geometry;
}

function createSingleTriangleGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 0, 0,
    1, 0, 0,
    0, 1, 0,
  ], 3));
  return geometry;
}

function createTexture(width, height, { generateMipmaps = false } = {}) {
  const texture = new THREE.Texture();
  texture.image = { width, height };
  texture.generateMipmaps = generateMipmaps;
  return texture;
}

test("createPerformanceDiagnostics reports visible complexity and de-duplicated textures", () => {
  const sharedTexture = createTexture(512, 512);
  const mipTexture = createTexture(256, 256, { generateMipmaps: true });
  const hiddenTexture = createTexture(1024, 1024);

  const visibleRoot = new THREE.Group();
  const hiddenRoot = new THREE.Group();
  hiddenRoot.visible = false;

  const multiMaterialMesh = new THREE.Mesh(
    createIndexedTriangleGeometry(),
    [
      new THREE.MeshBasicMaterial({ map: sharedTexture }),
      new THREE.MeshStandardMaterial({ normalMap: mipTexture }),
    ],
  );
  const visibleMesh = new THREE.Mesh(
    createSingleTriangleGeometry(),
    new THREE.MeshBasicMaterial({ alphaMap: sharedTexture }),
  );
  const hiddenMesh = new THREE.Mesh(
    createIndexedTriangleGeometry(),
    new THREE.MeshBasicMaterial({ map: hiddenTexture }),
  );
  hiddenMesh.visible = false;

  visibleRoot.add(multiMaterialMesh, visibleMesh, hiddenMesh);
  hiddenRoot.add(new THREE.Mesh(
    createIndexedTriangleGeometry(),
    new THREE.MeshStandardMaterial({ emissiveMap: hiddenTexture }),
  ));

  const statsElements = {
    statFps: createTextNode(),
    quickFpsValue: createTextNode(),
    bottomQuickFpsValue: createTextNode(),
    statFrameMs: createTextNode(),
    statDrawCalls: createTextNode(),
    statTriangles: createTextNode(),
    statTextures: createTextNode(),
    statTextureMemory: createTextNode(),
  };
  const diagnosticsState = {
    loadedLayers: [
      { root: visibleRoot },
      { root: hiddenRoot },
    ],
    fps: 61.8,
    frameMs: 16.666,
  };

  const diagnostics = createPerformanceDiagnostics({
    diagnosticsState,
    statsElements,
    getTextureDimensions: (image) => image,
  });

  diagnostics.update();

  assert.equal(statsElements.statFps.textContent, "62");
  assert.equal(statsElements.quickFpsValue.textContent, "62");
  assert.equal(statsElements.bottomQuickFpsValue.textContent, "62");
  assert.equal(statsElements.statFrameMs.textContent, "16.7 ms");
  assert.equal(statsElements.statDrawCalls.textContent, "3");
  assert.equal(statsElements.statTriangles.textContent, "3");
  assert.equal(statsElements.statTextures.textContent, "2");
  assert.equal(statsElements.statTextureMemory.textContent, "1.3 MB");
});

test("createPerformanceDiagnostics does nothing when disabled", () => {
  const statsElements = {
    statFps: createTextNode(),
  };
  const diagnostics = createPerformanceDiagnostics({
    enabled: false,
    diagnosticsState: {
      loadedLayers: [],
      fps: 120,
      frameMs: 8.3,
    },
    statsElements,
    getTextureDimensions: (image) => image,
  });

  diagnostics.update();

  assert.equal(statsElements.statFps.textContent, "");
});

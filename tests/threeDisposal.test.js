import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";

import {
  collectMaterialTextures,
  disposeObjectTree,
} from "../src/utils/threeDisposal.js";

test("collectMaterialTextures gathers direct maps and uniform textures without duplicates", () => {
  const baseTexture = new THREE.Texture();
  const detailTexture = new THREE.Texture();
  const material = new THREE.MeshBasicMaterial({ map: baseTexture });
  material.uniforms = {
    detailMap: { value: [baseTexture, detailTexture] },
  };

  const textures = collectMaterialTextures(material);

  assert.equal(textures.size, 2);
  assert.ok(textures.has(baseTexture));
  assert.ok(textures.has(detailTexture));
});

test("disposeObjectTree disposes shared resources once and clears tracked sets", () => {
  const geometry = new THREE.BufferGeometry();
  const texture = new THREE.Texture();
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const root = new THREE.Group();
  const scene = new THREE.Scene();

  let geometryDisposeCount = 0;
  let materialDisposeCount = 0;
  let textureDisposeCount = 0;

  geometry.dispose = () => {
    geometryDisposeCount += 1;
  };
  material.dispose = () => {
    materialDisposeCount += 1;
  };
  texture.dispose = () => {
    textureDisposeCount += 1;
  };

  root.add(
    new THREE.Mesh(geometry, material),
    new THREE.Mesh(geometry, material),
  );
  scene.add(root);

  const trackedMaterials = new Set([material]);

  disposeObjectTree(root, {
    trackedMaterialSets: [trackedMaterials],
  });

  assert.equal(geometryDisposeCount, 1);
  assert.equal(materialDisposeCount, 1);
  assert.equal(textureDisposeCount, 1);
  assert.equal(trackedMaterials.has(material), false);
  assert.equal(scene.children.includes(root), false);
  assert.equal(root.parent, null);
});

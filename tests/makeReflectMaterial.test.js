import test from "node:test";
import assert from "node:assert/strict";
import {
  BoxGeometry,
  Color,
  Euler,
  Mesh,
  MeshStandardMaterial,
  Texture,
  Vector2,
} from "three";

import { MATERIAL_PRESETS } from "../src/config/materialsConfig.js";
import { makeReflectMaterial } from "../src/materials/factories/makeReflectMaterial.js";

function applyTextureChannelOverride(texture, fallbackChannel) {
  if (!texture || !Number.isInteger(fallbackChannel) || fallbackChannel < 0) {
    return texture;
  }

  texture.channel = fallbackChannel;
  return texture;
}

test("makeReflectMaterial keeps GLB roughness and metalness values and binds packed maps", () => {
  const bakedTexture = new Texture();
  const ormTexture = new Texture();
  const normalTexture = new Texture();
  const sourceMaterial = new MeshStandardMaterial({
    name: "ReflectSource",
    color: new Color(0xffffff),
    roughness: 0.32,
    metalness: 0.85,
  });

  sourceMaterial.map = bakedTexture;
  sourceMaterial.roughnessMap = ormTexture;
  sourceMaterial.metalnessMap = ormTexture;
  sourceMaterial.aoMap = ormTexture;
  sourceMaterial.normalMap = normalTexture;
  sourceMaterial.normalScale = new Vector2(0.5, 0.75);

  const reflectionState = {
    envMapIntensity: 1.25,
    ior: 1.4,
    specularIntensity: 0.9,
    envMapRotationY: Math.PI / 3,
    materials: new Set(),
  };
  const mesh = new Mesh(new BoxGeometry(1, 1, 1), sourceMaterial);
  const envMap = new Texture();

  const material = makeReflectMaterial({
    viewerConfig: {
      materialPresets: MATERIAL_PRESETS,
    },
    reflectionState,
    reflectionEnvironment: {
      getClosestEnvMap() {
        return envMap;
      },
    },
    sourceMaterial,
    mesh,
    findMaterialTweak() {
      return null;
    },
    getMaterialColorTexture(source) {
      return source.map;
    },
    getMaterialRoughnessTexture(source) {
      return source.roughnessMap;
    },
    getMaterialMetalnessTexture(source) {
      return source.metalnessMap;
    },
    getMaterialNormalTexture(source) {
      return source.normalMap;
    },
    getMaterialAoTexture(source) {
      return source.aoMap;
    },
    getMaterialTint() {
      return new Color(0xffffff);
    },
    getFallbackTextureChannel(_mesh, preferredChannel) {
      return preferredChannel;
    },
    applyTextureChannelOverride,
    stampViewerMaterialData(targetMaterial) {
      targetMaterial.userData.sourceMaterialName = sourceMaterial.name;
    },
    applyViewerMaterialPatches() {},
    normalizeTexture(texture) {
      return texture;
    },
  });

  assert.equal(material.map, bakedTexture);
  assert.equal(material.roughnessMap, ormTexture);
  assert.equal(material.metalnessMap, ormTexture);
  assert.equal(material.aoMap, ormTexture);
  assert.equal(material.normalMap, normalTexture);
  assert.equal(material.roughness, 0.32);
  assert.equal(material.metalness, 0.85);
  assert.equal(material.userData.viewerReflectBaseMetalness, 0.85);
  assert.equal(material.userData.viewerReflectBaseColorBoost, 2.2);
  assert.equal(material.userData.viewerUvChannels.color, 1);
  assert.equal(material.userData.viewerUvChannels.roughness, 0);
  assert.equal(material.userData.viewerUvChannels.metalness, 0);
  assert.equal(material.userData.viewerUvChannels.ao, 0);
  assert.equal(material.userData.viewerUvChannels.normal, 0);
  assert.equal(material.map.channel, 1);
  assert.equal(material.roughnessMap.channel, 0);
  assert.equal(material.metalnessMap.channel, 0);
  assert.equal(material.aoMap.channel, 0);
  assert.equal(material.normalMap.channel, 0);
  assert.equal(material.envMap, envMap);
  assert.deepEqual(material.envMapRotation, new Euler(0, Math.PI / 3, 0));
  assert.equal(reflectionState.materials.has(material), true);
});

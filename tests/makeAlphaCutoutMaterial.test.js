import test from "node:test";
import assert from "node:assert/strict";
import { BufferGeometry, Color, Mesh, MeshBasicMaterial, Texture } from "three";

import { MATERIAL_PRESETS } from "../src/config/materialsConfig.js";
import { makeAlphaCutoutMaterial } from "../src/materials/factories/makeAlphaCutoutMaterial.js";

function applyTextureChannelOverride(texture, fallbackChannel) {
  if (!texture || !Number.isInteger(fallbackChannel) || fallbackChannel < 0) {
    return texture;
  }

  texture.channel = fallbackChannel;
  return texture;
}

test("makeAlphaCutoutMaterial uses baked color on UV_01 and alpha on UV_00", () => {
  const bakedTexture = new Texture();
  const alphaTexture = new Texture();
  const sourceMaterial = new MeshBasicMaterial({
    name: "LeafMaterial",
    color: new Color(0xffffff),
  });

  sourceMaterial.map = bakedTexture;
  sourceMaterial.alphaMap = alphaTexture;

  const material = makeAlphaCutoutMaterial({
    viewerConfig: {
      materialPresets: MATERIAL_PRESETS,
    },
    sourceMaterial,
    mesh: new Mesh(new BufferGeometry(), sourceMaterial),
    findMaterialTweak() {
      return null;
    },
    getMaterialTexture(source) {
      return source.map;
    },
    getMaterialAlphaTexture(source) {
      return source.alphaMap;
    },
    getMaterialTint() {
      return new Color(0xffffff);
    },
    getFallbackTextureChannel(_mesh, preferredChannel) {
      return preferredChannel;
    },
    applyTextureChannelOverride,
    tuneFoliageTexture(texture) {
      return texture;
    },
    stampViewerMaterialData() {},
    applyViewerMaterialPatches() {},
    applyTranslucencyPatch() {},
    translucencyConfig: MATERIAL_PRESETS.translucency,
    translucencySunDirection: null,
  });

  assert.equal(material.map, bakedTexture);
  assert.equal(material.alphaMap, alphaTexture);
  assert.equal(material.map.channel, 1);
  assert.equal(material.alphaMap.channel, 0);
  assert.equal(material.userData.viewerUvChannels.color, 1);
  assert.equal(material.userData.viewerUvChannels.alpha, 0);
  assert.equal(material.userData.viewerUvChannels.alphaSource, "alphaMap");
});

test("makeAlphaCutoutMaterial accepts roughnessMap as the opacity mask fallback", () => {
  const bakedTexture = new Texture();
  const opacityMaskTexture = new Texture();
  const sourceMaterial = new MeshBasicMaterial({
    name: "LeafMaterialFromRoughness",
    color: new Color(0xffffff),
  });

  sourceMaterial.map = bakedTexture;
  sourceMaterial.roughnessMap = opacityMaskTexture;

  const material = makeAlphaCutoutMaterial({
    viewerConfig: {
      materialPresets: MATERIAL_PRESETS,
    },
    sourceMaterial,
    mesh: new Mesh(new BufferGeometry(), sourceMaterial),
    findMaterialTweak() {
      return null;
    },
    getMaterialTexture(source) {
      return source.map;
    },
    getMaterialAlphaTexture(source) {
      return source.alphaMap || source.roughnessMap || null;
    },
    getMaterialTint() {
      return new Color(0xffffff);
    },
    getFallbackTextureChannel(_mesh, preferredChannel) {
      return preferredChannel;
    },
    applyTextureChannelOverride,
    tuneFoliageTexture(texture) {
      return texture;
    },
    stampViewerMaterialData() {},
    applyViewerMaterialPatches() {},
    applyTranslucencyPatch() {},
    translucencyConfig: MATERIAL_PRESETS.translucency,
    translucencySunDirection: null,
  });

  assert.equal(material.map, bakedTexture);
  assert.equal(material.alphaMap, opacityMaskTexture);
  assert.equal(material.map.channel, 1);
  assert.equal(material.alphaMap.channel, 0);
  assert.equal(material.userData.viewerUvChannels.color, 1);
  assert.equal(material.userData.viewerUvChannels.alpha, 0);
  assert.equal(material.userData.viewerUvChannels.alphaSource, "roughnessMap");
});

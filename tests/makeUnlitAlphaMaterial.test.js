import test from "node:test";
import assert from "node:assert/strict";
import { Color, MeshBasicMaterial, MeshStandardMaterial, Texture } from "three";

import { makeUnlitAlphaMaterial } from "../src/materials/factories/makeUnlitAlphaMaterial.js";

test("makeUnlitAlphaMaterial keeps emissive sky materials opaque when they have no alpha", () => {
  const emissiveTexture = new Texture();
  const sourceMaterial = new MeshStandardMaterial({
    name: "SkyMaterial",
    color: new Color(0x000000),
    emissive: new Color(0xffffff),
    opacity: 1,
  });
  sourceMaterial.emissiveMap = emissiveTexture;
  sourceMaterial.transparent = true;

  const material = makeUnlitAlphaMaterial({
    sourceMaterial,
    getMaterialTexture() {
      return null;
    },
    getMaterialAlphaTexture() {
      return null;
    },
    getMaterialTint() {
      return new Color(0xffffff);
    },
    normalizeTexture(texture) {
      return texture;
    },
    normalizeDataTexture(texture) {
      return texture;
    },
  });

  assert.equal(material.transparent, false);
  assert.equal(material.depthWrite, false);
  assert.equal(material.toneMapped, false);
  assert.equal(material.isMeshBasicMaterial, true);
  assert.equal(material.map, emissiveTexture);
});

test("makeUnlitAlphaMaterial stays transparent when an alpha map exists", () => {
  const colorTexture = new Texture();
  const alphaTexture = new Texture();

  const material = makeUnlitAlphaMaterial({
    sourceMaterial: {
      name: "CloudLayer",
      map: colorTexture,
      alphaMap: alphaTexture,
      opacity: 1,
      alphaTest: 0,
      vertexColors: false,
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
    normalizeTexture(texture) {
      return texture;
    },
    normalizeDataTexture(texture) {
      return texture;
    },
  });

  assert.equal(material.transparent, true);
  assert.equal(material.alphaMap, alphaTexture);
});

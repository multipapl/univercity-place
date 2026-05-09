import test from "node:test";
import assert from "node:assert/strict";
import { Color, Texture } from "three";

import { makeBackgroundMaterial } from "../src/materials/factories/makeBackgroundMaterial.js";

test("makeBackgroundMaterial uses roughnessMap as the background alpha fallback", () => {
  const colorTexture = new Texture();
  const opacityMaskTexture = new Texture();

  const material = makeBackgroundMaterial({
    viewerConfig: {
      materialPresets: {
        alphaCutoff: 0.5,
        background: {
          warpStrength: 0,
          warpScale: 1,
          warpSpeed: 0,
          shimmerStrength: 0,
          shimmerSpeed: 0,
        },
      },
    },
    backgroundState: {
      hueDegrees: 0,
      saturation: 1,
      value: 1,
      motionTime: 0,
      materials: new Set(),
    },
    sourceMaterial: {
      name: "BG360",
      map: colorTexture,
      roughnessMap: opacityMaskTexture,
      opacity: 1,
      alphaTest: 0,
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
  });

  assert.equal(material.transparent, false);
  assert.equal(material.alphaTest, 0.5);
  assert.equal(
    material.userData.viewerBackgroundUniforms.viewerBackgroundAlphaMap.value,
    opacityMaskTexture,
  );
  assert.equal(
    material.userData.viewerBackgroundUniforms.viewerBackgroundAlphaCutoff.value,
    0.5,
  );
});

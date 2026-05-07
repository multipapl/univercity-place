import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";

import { createTextureUtils } from "../src/materials/textureUtils.js";

test("tuneBakedTexture applies and preserves per-surface anisotropy tuning", () => {
  const { tuneBakedTexture } = createTextureUtils({
    viewerConfig: {
      runtimeOptimization: {
        baseTextureMaxSize: 0,
        lowMemoryBaseMipmaps: false,
      },
      materialPresets: {},
    },
    maxSupportedAnisotropy: 8,
  });
  const texture = new THREE.Texture();

  tuneBakedTexture(texture, { anisotropy: 16 });

  assert.equal(texture.anisotropy, 8);
  assert.deepEqual(texture.userData.viewerBakedTextureTuning, {
    anisotropy: 16,
  });

  texture.anisotropy = 1;
  tuneBakedTexture(texture);

  assert.equal(texture.anisotropy, 8);
});

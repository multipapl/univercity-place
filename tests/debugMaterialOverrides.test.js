import test from "node:test";
import assert from "node:assert/strict";
import { ShaderMaterial } from "three";

import { createDebugMaterialOverrides } from "../src/materials/debugMaterialOverrides.js";

test("debug material overrides support background shader materials in real time", () => {
  const material = new ShaderMaterial();
  material.userData.viewerBackgroundUniforms = {
    viewerDebugHue: { value: 0 },
    viewerDebugSaturation: { value: 1 },
    viewerDebugValue: { value: 1 },
    viewerDebugGamma: { value: 1 },
  };

  const overrides = createDebugMaterialOverrides({
    getMaterialCompileHookState() {
      return {
        hooks: new Map(),
      };
    },
    setMaterialCompileHook() {},
  });

  assert.equal(overrides.canApplyDebugColorCorrection(material), true);
  assert.equal(
    overrides.applyDebugColorCorrection(material, {
      hue: 30,
      saturation: 1.2,
      value: 0.9,
      gamma: 1.1,
    }),
    true,
  );
  assert.equal(material.userData.viewerBackgroundUniforms.viewerDebugHue.value, 30 / 360);
  assert.equal(material.userData.viewerBackgroundUniforms.viewerDebugSaturation.value, 1.2);
  assert.equal(material.userData.viewerBackgroundUniforms.viewerDebugValue.value, 0.9);
  assert.equal(material.userData.viewerBackgroundUniforms.viewerDebugGamma.value, 1.1);

  overrides.clearDebugColorCorrection(material);

  assert.equal(material.userData.viewerBackgroundUniforms.viewerDebugHue.value, 0);
  assert.equal(material.userData.viewerBackgroundUniforms.viewerDebugSaturation.value, 1);
  assert.equal(material.userData.viewerBackgroundUniforms.viewerDebugValue.value, 1);
  assert.equal(material.userData.viewerBackgroundUniforms.viewerDebugGamma.value, 1);
});

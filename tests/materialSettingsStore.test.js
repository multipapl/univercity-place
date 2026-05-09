import test from "node:test";
import assert from "node:assert/strict";

import {
  applyMaterialSettingsDocumentToState,
  createDefaultMaterialSettingsDocument,
  createMaterialSettingsDocumentFromState,
  normalizeMaterialSettingsDocument,
} from "../src/debug/materialSettingsStore.js";

function createBaseViewerConfig() {
  return {
    materialPresets: {
      background: {
        hueDegrees: 5,
        saturation: 0.9,
        value: 1.1,
        gamma: 1.2,
      },
      sky: {
        hueDegrees: -10,
        saturation: 0.7,
        value: 1.15,
        gamma: 0.95,
      },
      reflectMaterial: {
        envMapIntensity: 1.4,
        ior: 1.45,
        specularIntensity: 0.8,
        envMapRotationDegrees: 135,
      },
    },
  };
}

test("normalizeMaterialSettingsDocument falls back to viewer config defaults", () => {
  const baseViewerConfig = createBaseViewerConfig();
  const defaults = createDefaultMaterialSettingsDocument(baseViewerConfig);
  const normalized = normalizeMaterialSettingsDocument({
    version: 3,
    background: {
      hueDegrees: 25,
    },
    reflect: {
      probeRotationYDegrees: 45,
    },
  }, baseViewerConfig);

  assert.deepEqual(defaults.sky, {
    hueDegrees: -10,
    saturation: 0.7,
    value: 1.15,
    gamma: 0.95,
  });
  assert.equal(normalized.version, 3);
  assert.equal(normalized.background.hueDegrees, 25);
  assert.equal(normalized.background.saturation, 0.9);
  assert.equal(normalized.reflect.probeRotationYDegrees, 45);
  assert.equal(normalized.reflect.envMapIntensity, 1.4);
});

test("material settings documents round-trip through state", () => {
  const state = {
    backgroundState: {
      hueDegrees: 0,
      saturation: 1,
      value: 1,
      gamma: 1,
    },
    skyState: {
      hueDegrees: 0,
      saturation: 1,
      value: 1,
      gamma: 1,
    },
    reflectionState: {
      envMapIntensity: 1,
      ior: 1.5,
      specularIntensity: 1,
      envMapRotationY: 0,
    },
  };

  applyMaterialSettingsDocumentToState({
    version: 1,
    background: {
      hueDegrees: 12,
      saturation: 0.84,
      value: 1.08,
      gamma: 1.1,
    },
    sky: {
      hueDegrees: -8,
      saturation: 0.74,
      value: 1.2,
      gamma: 0.92,
    },
    reflect: {
      envMapIntensity: 1.6,
      ior: 1.35,
      specularIntensity: 0.72,
      probeRotationYDegrees: 90,
    },
  }, state);

  assert.equal(state.backgroundState.hueDegrees, 12);
  assert.equal(state.skyState.gamma, 0.92);
  assert.equal(state.reflectionState.envMapRotationY, Math.PI / 2);

  const documentValue = createMaterialSettingsDocumentFromState(state);
  assert.equal(documentValue.reflect.probeRotationYDegrees, 90);
  assert.equal("metalness" in documentValue.reflect, false);
});

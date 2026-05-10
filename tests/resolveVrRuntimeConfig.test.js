import test from "node:test";
import assert from "node:assert/strict";

import { resolveVrRuntimeConfig } from "../src/vr/resolveVrRuntimeConfig.js";

function createViewerConfig(overrides = {}) {
  return {
    vr: {
      enabled: false,
      allowUrlOverride: true,
      queryParam: "vr",
      disableQueryParam: "novr",
      startupMode: "safe",
      baseOnly: false,
      qualityPreset: "stable",
      framebufferScaleFactor: null,
      foveation: null,
      safeLayerProfile: {
        includeLayerIds: ["base", "reflect"],
        excludeLayerIds: ["fire"],
        disableFireVideoTextures: true,
        disableProbeLoadWhenBaseOnly: true,
      },
      materialSafetyProfile: {
        hideTransparentBakedMeshes: true,
        useCheapGlassMaterial: true,
      },
      session: {
        optionalFeatures: ["hand-tracking"],
      },
      ...overrides,
    },
  };
}

test("resolveVrRuntimeConfig keeps VR fully disabled by default", () => {
  const runtimeConfig = resolveVrRuntimeConfig({
    viewerConfig: createViewerConfig(),
    searchParams: new URLSearchParams(),
  });

  assert.equal(runtimeConfig.enabled, false);
  assert.equal(runtimeConfig.renderer.antialias, true);
  assert.deepEqual(runtimeConfig.sceneLoader, {});
});

test("resolveVrRuntimeConfig enables safe VR via query override", () => {
  const runtimeConfig = resolveVrRuntimeConfig({
    viewerConfig: createViewerConfig(),
    searchParams: new URLSearchParams("vr=1&baseOnly=1&xrQuality=sharp&xrScale=0.75&xrFoveation=0.25"),
  });

  assert.equal(runtimeConfig.enabled, true);
  assert.equal(runtimeConfig.safeMode, true);
  assert.equal(runtimeConfig.baseOnly, true);
  assert.equal(runtimeConfig.renderer.antialias, true);
  assert.equal(runtimeConfig.session.framebufferScaleFactor, 0.75);
  assert.equal(runtimeConfig.session.foveation, 0.25);
  assert.equal(runtimeConfig.sceneLoader.requiredLayersOnly, true);
  assert.equal(runtimeConfig.sceneLoader.disableProbeLoad, true);
  assert.deepEqual(runtimeConfig.materialSafetyProfile, {
    hideTransparentBakedMeshes: true,
    useCheapGlassMaterial: true,
  });
});

test("resolveVrRuntimeConfig honors explicit novr override", () => {
  const runtimeConfig = resolveVrRuntimeConfig({
    viewerConfig: createViewerConfig({ enabled: true }),
    searchParams: new URLSearchParams("novr=1"),
  });

  assert.equal(runtimeConfig.enabled, false);
});

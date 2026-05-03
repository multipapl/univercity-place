import test from "node:test";
import assert from "node:assert/strict";

import {
  appendAssetQuery,
  resolveAssetContract,
  resolveSceneLayers,
} from "../src/loaders/assetResolver.js";

test("resolveAssetContract prefers query overrides and appends assetBust once", () => {
  const assetContract = {
    id: "base",
    searchParam: "scene",
    url: "https://assets.example.com/scene.glb",
    runtime: {
      preferAsSpawnRoot: true,
    },
  };
  const searchParams = new URLSearchParams({
    scene: "https://cdn.example.com/custom.glb",
  });

  const resolved = resolveAssetContract(assetContract, searchParams, "v=123");

  assert.equal(resolved.url, "https://cdn.example.com/custom.glb?v=123");
  assert.equal(resolved.runtime.preferAsSpawnRoot, true);
  assert.equal(
    appendAssetQuery(resolved.url, "v=123"),
    "https://cdn.example.com/custom.glb?v=123",
  );
});

test("resolveSceneLayers preserves manifest metadata when no override is present", () => {
  const resolvedLayers = resolveSceneLayers([
    {
      id: "fx",
      searchParam: "fx",
      url: "https://assets.example.com/fx.glb",
      runtime: {
        enableBloom: true,
        applyFireVideoTexture: true,
      },
    },
  ], new URLSearchParams(), "v=456");

  assert.equal(resolvedLayers.length, 1);
  assert.equal(resolvedLayers[0].url, "https://assets.example.com/fx.glb?v=456");
  assert.equal(resolvedLayers[0].runtime.enableBloom, true);
  assert.equal(resolvedLayers[0].runtime.applyFireVideoTexture, true);
});

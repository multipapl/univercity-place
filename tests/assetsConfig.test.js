import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTIVE_SCENE_ASSET_SOURCE,
  FIRE_VIDEO_ASSET_CONTRACT,
  LOCAL_SCENE_ASSET_BASE_URL,
  PROBES_ASSET_CONTRACT,
  SCENE_LAYER_CONTRACTS,
  getMissingSceneStatusMessage,
} from "../src/config/assetsConfig.js";

test("assetsConfig exposes a single manifest for scene layers and runtime assets", () => {
  assert.equal(ACTIVE_SCENE_ASSET_SOURCE, "local");

  const baseLayer = SCENE_LAYER_CONTRACTS.find((layer) => layer.runtime?.preferAsSpawnRoot);
  const backgroundLayer = SCENE_LAYER_CONTRACTS.find((layer) => layer.runtime?.registerAsBackgroundRoot);
  const bloomLayers = SCENE_LAYER_CONTRACTS.filter((layer) => layer.runtime?.enableBloom);

  assert.ok(baseLayer);
  assert.equal(baseLayer.localPath, "scene.glb");
  assert.equal(baseLayer.urls.local, `${LOCAL_SCENE_ASSET_BASE_URL}/scene.glb`);
  assert.equal(baseLayer.runtime.applyBaseTextureOptimizations, true);

  assert.ok(backgroundLayer);
  assert.equal(backgroundLayer.localPath, "bg.glb");

  assert.ok(bloomLayers.length >= 1);
  const fireLayer = bloomLayers.find((l) => l.id === "fire");
  assert.ok(fireLayer);
  assert.equal(fireLayer.localPath, "fire.glb");
  assert.equal(fireLayer.runtime.applyFireVideoTexture, true);

  const emissiveLayer = bloomLayers.find((l) => l.id === "emissive");
  assert.ok(emissiveLayer);
  assert.equal(emissiveLayer.localPath, "emissive.glb");

  assert.equal(FIRE_VIDEO_ASSET_CONTRACT.localPath, "fire.mp4");
  assert.equal(FIRE_VIDEO_ASSET_CONTRACT.urls.local, `${LOCAL_SCENE_ASSET_BASE_URL}/fire.mp4`);
  assert.equal(PROBES_ASSET_CONTRACT.localPath, "probes.glb");
  assert.equal(PROBES_ASSET_CONTRACT.urls.local, `${LOCAL_SCENE_ASSET_BASE_URL}/probes.glb`);
  assert.match(getMissingSceneStatusMessage(), /\/public\/assets\/scene\/scene\.glb/);
});

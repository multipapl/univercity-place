import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTIVE_SCENE_ASSET_SOURCE,
  FIRE_VIDEO_ASSET_CONTRACT,
  LOCAL_SCENE_ASSET_BASE_URL,
  REFLECTION_ENVIRONMENT_ASSET_CONTRACT,
  SCENE_LAYER_CONTRACTS,
  getMissingSceneStatusMessage,
} from "../src/config/assetsConfig.js";

test("assetsConfig exposes a single manifest for scene layers and runtime assets", () => {
  assert.equal(ACTIVE_SCENE_ASSET_SOURCE, "local");

  const baseLayer = SCENE_LAYER_CONTRACTS.find((layer) => layer.runtime?.preferAsSpawnRoot);
  const backgroundLayer = SCENE_LAYER_CONTRACTS.find((layer) => layer.runtime?.registerAsBackgroundRoot);
  const bloomLayer = SCENE_LAYER_CONTRACTS.find((layer) => layer.runtime?.enableBloom);

  assert.ok(baseLayer);
  assert.equal(baseLayer.localPath, "scene.glb");
  assert.equal(baseLayer.urls.local, `${LOCAL_SCENE_ASSET_BASE_URL}/scene.glb`);
  assert.equal(baseLayer.runtime.applyBaseTextureOptimizations, true);

  assert.ok(backgroundLayer);
  assert.equal(backgroundLayer.localPath, "bg.glb");

  assert.ok(bloomLayer);
  assert.equal(bloomLayer.localPath, "fx.glb");
  assert.equal(bloomLayer.runtime.applyFireVideoTexture, true);

  assert.equal(FIRE_VIDEO_ASSET_CONTRACT.localPath, "fire.mp4");
  assert.equal(FIRE_VIDEO_ASSET_CONTRACT.urls.local, `${LOCAL_SCENE_ASSET_BASE_URL}/fire.mp4`);
  assert.equal(REFLECTION_ENVIRONMENT_ASSET_CONTRACT.localPath, "cubemap.png");
  assert.equal(REFLECTION_ENVIRONMENT_ASSET_CONTRACT.urls.local, `${LOCAL_SCENE_ASSET_BASE_URL}/cubemap.png`);
  assert.match(getMissingSceneStatusMessage(), /\/public\/assets\/scene\/scene\.glb/);
});

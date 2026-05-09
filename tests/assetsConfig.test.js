import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTIVE_SCENE_ASSET_SOURCE,
  AMBIENT_AUDIO_ASSET_CONTRACT,
  FIRE_VIDEO_ASSET_CONTRACT,
  LOCAL_AUDIO_ASSET_BASE_URL,
  LOCAL_RENDERS_BASE_URL,
  LOCAL_SCENE_ASSET_BASE_URL,
  PROBES_ASSET_CONTRACT,
  SCENE_LAYER_CONTRACTS,
  deriveRemoteAssetBaseUrlFromSceneBaseUrl,
  getMissingSceneStatusMessage,
  resolveConfiguredAssetBaseUrls,
} from "../src/config/assetsConfig.js";

test("assetsConfig exposes a single manifest for scene layers and runtime assets", () => {
  assert.equal(ACTIVE_SCENE_ASSET_SOURCE, "local");

  const baseLayer = SCENE_LAYER_CONTRACTS.find((layer) => layer.runtime?.preferAsSpawnRoot);
  const backgroundLayer = SCENE_LAYER_CONTRACTS.find((layer) => layer.runtime?.registerAsBackgroundRoot);
  const collisionLayer = SCENE_LAYER_CONTRACTS.find((layer) => layer.runtime?.registerAsCollisionRoot);
  const bloomLayers = SCENE_LAYER_CONTRACTS.filter((layer) => layer.runtime?.enableBloom);

  assert.ok(baseLayer);
  assert.equal(baseLayer.localPath, "scene.glb");
  assert.equal(baseLayer.urls.local, `${LOCAL_SCENE_ASSET_BASE_URL}/scene.glb`);
  assert.equal(baseLayer.runtime.applyBaseTextureOptimizations, true);

  assert.ok(backgroundLayer);
  assert.equal(backgroundLayer.localPath, "bg.glb");

  assert.ok(collisionLayer);
  assert.equal(collisionLayer.localPath, "collision.glb");

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
  assert.equal(AMBIENT_AUDIO_ASSET_CONTRACT.localPath, "atlasaudio-ambient-soft-511880.mp3");
  assert.equal(
    AMBIENT_AUDIO_ASSET_CONTRACT.urls.local,
    `${LOCAL_AUDIO_ASSET_BASE_URL}/atlasaudio-ambient-soft-511880.mp3`,
  );
  assert.equal(LOCAL_RENDERS_BASE_URL, "/assets/renders");
  assert.match(getMissingSceneStatusMessage(), /\/public\/assets\/scene\/scene\.glb/);
});

test("assetsConfig derives a shared remote asset root from the scene base URL", () => {
  assert.equal(
    deriveRemoteAssetBaseUrlFromSceneBaseUrl("https://cdn.example.com/assets/scene"),
    "https://cdn.example.com/assets",
  );

  const resolved = resolveConfiguredAssetBaseUrls({
    VITE_SCENE_ASSET_BASE_URL: "https://cdn.example.com/assets/scene",
  });

  assert.equal(resolved.remoteAssetBaseUrl, "https://cdn.example.com/assets");
  assert.equal(resolved.remoteSceneAssetBaseUrl, "https://cdn.example.com/assets/scene");
  assert.equal(resolved.remoteRendersBaseUrl, "https://cdn.example.com/assets/renders");
  assert.equal(resolved.remoteAudioAssetBaseUrl, "https://cdn.example.com/assets/audio");
});

test("assetsConfig supports explicit root and per-category overrides", () => {
  const resolved = resolveConfiguredAssetBaseUrls({
    VITE_ASSET_BASE_URL: "https://cdn.example.com/assets",
    VITE_AUDIO_ASSET_BASE_URL: "https://media.example.com/audio",
  });

  assert.equal(resolved.remoteSceneAssetBaseUrl, "https://cdn.example.com/assets/scene");
  assert.equal(resolved.remoteRendersBaseUrl, "https://cdn.example.com/assets/renders");
  assert.equal(resolved.remoteAudioAssetBaseUrl, "https://media.example.com/audio");
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  createObjectOverrideStore,
  createTargetKey,
  normalizeTargetOverride,
} from "../src/debug/objectOverrideStore.js";

test("normalizeTargetOverride trims identifiers and falls back for invalid values", () => {
  const normalized = normalizeTargetOverride({
    layerId: "  base  ",
    meshName: "  Door  ",
    meshPath: "  Room/Door  ",
    materialName: "  Glass  ",
    materialSlot: 1.5,
    hue: Number.NaN,
    saturation: 0.75,
    value: Infinity,
    gamma: 1.2,
  });

  assert.deepEqual(normalized, {
    layerId: "base",
    meshName: "Door",
    meshPath: "Room/Door",
    materialName: "Glass",
    materialSlot: 0,
    hue: 0,
    saturation: 0.75,
    value: 1,
    gamma: 1.2,
  });
});

test("createTargetKey prefers meshPath when present", () => {
  const targetKey = createTargetKey({
    layerId: "alpha",
    meshName: "LeafCard",
    meshPath: "Tree[0]/LeafCard[2]",
    materialName: "LeafMat",
    materialSlot: 3,
  });

  assert.equal(targetKey, "alpha::Tree[0]/LeafCard[2]::LeafMat::3");
});

test("createObjectOverrideStore updates existing targets and drops defaults", () => {
  const store = createObjectOverrideStore({
    version: 4,
    targets: [
      {
        layerId: "fx",
        meshName: "FirePlane",
        materialName: "Fire",
        materialSlot: 0,
        hue: 10,
        saturation: 1.1,
        value: 0.9,
        gamma: 1.2,
      },
    ],
  });

  const updated = store.upsertOverride({
    layerId: "fx",
    meshName: "FirePlane",
    materialName: "Fire",
    materialSlot: 0,
    hue: 25,
    saturation: 0.85,
    value: 1.05,
    gamma: 1.1,
  });

  assert.equal(store.getDocument().targets.length, 1);
  assert.deepEqual(updated, {
    layerId: "fx",
    meshName: "FirePlane",
    meshPath: "",
    materialName: "Fire",
    materialSlot: 0,
    hue: 25,
    saturation: 0.85,
    value: 1.05,
    gamma: 1.1,
  });
  assert.deepEqual(
    store.getOverrideByKey("fx::FirePlane::Fire::0"),
    updated,
  );

  const removed = store.resetOverride({
    layerId: "fx",
    meshName: "FirePlane",
    materialName: "Fire",
    materialSlot: 0,
  });

  assert.equal(removed, null);
  assert.deepEqual(store.getDocument(), {
    version: 4,
    targets: [],
  });
});

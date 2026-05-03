import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMeshPath,
  describeMaterialTarget,
} from "../src/materials/debugMaterialTargeting.js";

function createNode({ name = "", type = "Object3D", userData = {} } = {}) {
  return {
    name,
    type,
    userData,
    parent: null,
    children: [],
  };
}

function appendChild(parent, child) {
  child.parent = parent;
  parent.children.push(child);
  return child;
}

test("buildMeshPath stops at the viewer layer root and includes sibling indexes", () => {
  const layerRoot = createNode({
    name: "BaseLayerRoot",
    userData: { viewerLayerId: "base" },
  });
  const room = appendChild(layerRoot, createNode({ name: "Room", type: "Group" }));
  appendChild(room, createNode({ name: "Column", type: "Mesh" }));
  const door = appendChild(room, createNode({ name: "Door", type: "Mesh" }));

  assert.equal(buildMeshPath(door), "Room[0]/Door[1]");
  assert.equal(buildMeshPath(null), "");
});

test("describeMaterialTarget prefers source names and falls back to material layer ids", () => {
  const root = createNode({ name: "LooseRoot" });
  const mesh = appendChild(root, createNode({ name: "GlassPanel", type: "Mesh" }));
  const material = {
    name: "RuntimeGlass",
    userData: {
      viewerLayerId: "glass",
      sourceMaterialName: "Glass_Master",
    },
  };

  const target = describeMaterialTarget(mesh, material, "bad-slot");

  assert.deepEqual(target, {
    layerId: "glass",
    meshName: "GlassPanel",
    meshPath: "LooseRoot[0]/GlassPanel[0]",
    materialName: "Glass_Master",
    materialSlot: 0,
  });
});

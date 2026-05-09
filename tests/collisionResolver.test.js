import test from "node:test";
import assert from "node:assert/strict";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from "three";

import {
  buildCollisionBoxes,
  collectCollisionMeshes,
  resolvePointCollisionMovement,
  resolveWalkCollisionMovement,
} from "../src/camera/collisionResolver.js";

test("buildCollisionBoxes collects world-space boxes for collision meshes", () => {
  const root = new Group();
  const mesh = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
  mesh.position.set(5, 0, 0);
  root.add(mesh);

  const boxes = buildCollisionBoxes([root]);

  assert.equal(boxes.length, 1);
  assert.equal(Number(boxes[0].min.x.toFixed(2)), 4);
  assert.equal(Number(boxes[0].max.x.toFixed(2)), 6);
});

test("resolvePointCollisionMovement blocks motion into a wall and keeps sliding axis free", () => {
  const wall = new BoxGeometry(1, 4, 4);
  const wallMesh = new Mesh(wall, new MeshBasicMaterial());
  wallMesh.position.set(0, 0, 0);
  const root = new Group();
  root.add(wallMesh);

  const boxes = buildCollisionBoxes([root]);
  const start = new Vector3(-1.5, 0, -1);
  const desiredDelta = new Vector3(2, 0, 1);

  const resolved = resolvePointCollisionMovement(start, desiredDelta, boxes, 0.05);

  assert.ok(resolved.x < -0.2);
  assert.ok(resolved.z > -0.2);
});

test("resolveWalkCollisionMovement ignores floor slabs but blocks walls", () => {
  const root = new Group();

  const floorMesh = new Mesh(new BoxGeometry(20, 0.2, 20), new MeshBasicMaterial());
  floorMesh.position.set(0, -0.1, 0);
  root.add(floorMesh);

  const wallMesh = new Mesh(new BoxGeometry(0.4, 2.5, 4), new MeshBasicMaterial());
  wallMesh.position.set(0, 1.25, 0);
  root.add(wallMesh);

  const meshes = collectCollisionMeshes([root]);
  const start = new Vector3(-1.5, 1.2, 0);
  const desiredDelta = new Vector3(2, 0, 0);

  const resolved = resolveWalkCollisionMovement(start, desiredDelta, meshes, {
    radius: 0.2,
    bodyMinY: 0.04,
    bodyMaxY: 1.73,
    maxStepLength: 0.05,
    skin: 0.02,
  });

  assert.ok(resolved.x < -0.25);
  assert.equal(Number(resolved.y.toFixed(2)), 1.2);
});

test("resolveWalkCollisionMovement respects capsule radius against exact meshes", () => {
  const root = new Group();
  const wallMesh = new Mesh(new BoxGeometry(0.2, 2.5, 0.2), new MeshBasicMaterial());
  wallMesh.position.set(0, 1.25, 0.22);
  root.add(wallMesh);

  const meshes = collectCollisionMeshes([root]);
  const start = new Vector3(-1, 1.2, 0);
  const desiredDelta = new Vector3(1.2, 0, 0);

  const resolved = resolveWalkCollisionMovement(start, desiredDelta, meshes, {
    radius: 0.25,
    bodyMinY: 0.04,
    bodyMaxY: 1.73,
    maxStepLength: 0.05,
    skin: 0.02,
  });

  assert.ok(resolved.x < -0.05);
});

test("resolveWalkCollisionMovement catches raised mid-height obstacles between sample bands", () => {
  const root = new Group();
  const raisedObstacle = new Mesh(new BoxGeometry(0.3, 0.4, 0.6), new MeshBasicMaterial());
  raisedObstacle.position.set(0, 0.6, 0);
  root.add(raisedObstacle);

  const meshes = collectCollisionMeshes([root]);
  const start = new Vector3(-1, 1.7, 0);
  const desiredDelta = new Vector3(1.4, 0, 0);

  const resolved = resolveWalkCollisionMovement(start, desiredDelta, meshes, {
    radius: 0.2,
    bodyMinY: 0.54,
    bodyMaxY: 2.23,
    maxStepLength: 0.05,
    skin: 0.02,
  });

  assert.ok(resolved.x < -0.1);
});

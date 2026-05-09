import { Box3, Raycaster, Vector3 } from "three";

const AXES = ["x", "y", "z"];
const HORIZONTAL_AXES = ["x", "z"];
const SAMPLE_HEIGHT_FACTORS = [
  0.05,
  0.15,
  0.25,
  0.35,
  0.45,
  0.55,
  0.65,
  0.75,
  0.85,
  0.95,
];
const FOOTPRINT_OFFSETS = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.70710678, 0.70710678],
  [-0.70710678, 0.70710678],
  [0.70710678, -0.70710678],
  [-0.70710678, -0.70710678],
];
const WALK_RAYCASTER = new Raycaster();
const WALK_DIRECTION = new Vector3();
const WALK_ORIGIN = new Vector3();
const WORLD_NORMAL = new Vector3();

export function buildCollisionBoxes(collisionRoots = []) {
  const boxes = [];

  collisionRoots.forEach((root) => {
    root?.updateMatrixWorld?.(true);
    root?.traverse?.((child) => {
      if (!child?.isMesh || !child.geometry) {
        return;
      }

      if (!child.geometry.boundingBox) {
        child.geometry.computeBoundingBox();
      }

      if (!child.geometry.boundingBox) {
        return;
      }

      const worldBox = child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld);

      if (!worldBox.isEmpty()) {
        boxes.push(worldBox);
      }
    });
  });

  return boxes;
}

export function collectCollisionMeshes(collisionRoots = []) {
  const meshes = [];

  collisionRoots.forEach((root) => {
    root?.updateMatrixWorld?.(true);
    root?.traverse?.((child) => {
      if (child?.isMesh && child.geometry) {
        meshes.push(child);
      }
    });
  });

  return meshes;
}

export function resolveWalkCollisionMovement(
  startPosition,
  desiredDelta,
  collisionMeshes = [],
  {
    radius = 0.2,
    bodyMinY = 0,
    bodyMaxY = 1,
    maxStepLength = 0.1,
    skin = 0.001,
  } = {},
) {
  const resolvedPosition = startPosition.clone();
  if (!collisionMeshes.length || desiredDelta.lengthSq() === 0) {
    return resolvedPosition.add(desiredDelta);
  }

  const horizontalDelta = desiredDelta.clone();
  horizontalDelta.y = 0;

  if (horizontalDelta.lengthSq() === 0) {
    return resolvedPosition.add(desiredDelta);
  }

  const stepLength = Math.max(0.01, maxStepLength);
  const stepCount = Math.max(1, Math.ceil(horizontalDelta.length() / stepLength));
  const stepDelta = horizontalDelta.divideScalar(stepCount);
  const nextPosition = resolvedPosition.clone();

  for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
    nextPosition.copy(resolvedPosition);

    HORIZONTAL_AXES.forEach((axis) => {
      if (Math.abs(stepDelta[axis]) < 0.000001) {
        return;
      }

      nextPosition[axis] += stepDelta[axis];
      if (isWalkRayMovementBlocked(
        resolvedPosition,
        nextPosition,
        collisionMeshes,
        radius,
        bodyMinY,
        bodyMaxY,
        skin,
      )) {
        nextPosition[axis] -= stepDelta[axis];
      }
    });

    resolvedPosition.copy(nextPosition);
  }

  resolvedPosition.y += desiredDelta.y;
  return resolvedPosition;
}

export function resolvePointCollisionMovement(
  startPosition,
  desiredDelta,
  collisionBoxes = [],
  maxStepLength = 0.1,
) {
  const resolvedPosition = startPosition.clone();
  if (!collisionBoxes.length || desiredDelta.lengthSq() === 0) {
    return resolvedPosition.add(desiredDelta);
  }

  const stepLength = Math.max(0.01, maxStepLength);
  const stepCount = Math.max(1, Math.ceil(desiredDelta.length() / stepLength));
  const stepDelta = desiredDelta.clone().divideScalar(stepCount);
  const nextPosition = resolvedPosition.clone();

  for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
    nextPosition.copy(resolvedPosition);

    AXES.forEach((axis) => {
      if (Math.abs(stepDelta[axis]) < 0.000001) {
        return;
      }

      const currentCollisionState = measurePointCollisionState(nextPosition, collisionBoxes);
      nextPosition[axis] += stepDelta[axis];
      const nextCollisionState = measurePointCollisionState(nextPosition, collisionBoxes);
      const isBlocked = nextCollisionState.count > 0 && !isCollisionStateImproved(
        currentCollisionState,
        nextCollisionState,
      );
      if (isBlocked) {
        nextPosition[axis] -= stepDelta[axis];
      }
    });

    resolvedPosition.copy(nextPosition);
  }

  return resolvedPosition;
}

function measurePointCollisionState(point, collisionBoxes) {
  let count = 0;
  let exitDistance = 0;

  collisionBoxes.forEach((box) => {
    if (!box.containsPoint(point)) {
      return;
    }

    count += 1;
    exitDistance += Math.min(
      point.x - box.min.x,
      box.max.x - point.x,
      point.y - box.min.y,
      box.max.y - point.y,
      point.z - box.min.z,
      box.max.z - point.z,
    );
  });

  return {
    count,
    exitDistance,
  };
}

function isCollisionStateImproved(currentState, nextState) {
  if (nextState.count === 0) {
    return true;
  }

  if (currentState.count === 0) {
    return false;
  }

  if (nextState.count < currentState.count) {
    return true;
  }

  return nextState.count === currentState.count
    && nextState.exitDistance < currentState.exitDistance - 0.000001;
}

function isWalkRayMovementBlocked(startPosition, nextPosition, collisionMeshes, radius, bodyMinY, bodyMaxY, skin) {
  WALK_DIRECTION.copy(nextPosition).sub(startPosition);
  const distance = WALK_DIRECTION.length();
  if (distance < 0.000001) {
    return false;
  }

  WALK_DIRECTION.divideScalar(distance);
  const bodyHeight = Math.max(0.01, bodyMaxY - bodyMinY);
  const footprintRadius = Math.max(0, radius - skin);

  return SAMPLE_HEIGHT_FACTORS.some((factor) => {
    const sampleY = bodyMinY + (bodyHeight * factor);

    return FOOTPRINT_OFFSETS.some(([offsetX, offsetZ]) => {
      WALK_ORIGIN.set(
        startPosition.x + (offsetX * footprintRadius),
        sampleY,
        startPosition.z + (offsetZ * footprintRadius),
      );

      WALK_RAYCASTER.set(WALK_ORIGIN, WALK_DIRECTION);
      WALK_RAYCASTER.far = distance + skin;
      const intersections = WALK_RAYCASTER.intersectObjects(collisionMeshes, false);

      return intersections.some((intersection) => {
        if (intersection.distance <= skin || intersection.distance > distance + skin) {
          return false;
        }

        if (!intersection.face) {
          return true;
        }

        WORLD_NORMAL.copy(intersection.face.normal).transformDirection(intersection.object.matrixWorld);
        return Math.abs(WORLD_NORMAL.y) < 0.6;
      });
    });
  });
}

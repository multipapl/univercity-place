import {
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Raycaster,
  RingGeometry,
  Vector3,
} from "three";

const MIN_FLOOR_DOT = 0.8;
const TELEPORT_MARKER_HOLD_MS = 420;
const TELEPORT_MARKER_BASE_OPACITY = 0.72;
const TELEPORT_MARKER_PULSE_SCALE = 1.7;

export function createVrNavigation({
  renderer,
  scene,
  sceneRoots,
  getInitialPosition,
}) {
  const raycaster = new Raycaster();
  const tempMatrix = new Matrix4();
  const upVector = new Vector3(0, 1, 0);
  const worldNormal = new Vector3();
  const viewerPosition = new Vector3();
  const tempQuaternion = new Quaternion();
  const tempDirection = new Vector3();

  let baseReferenceSpace = null;
  let intersection = null;
  let isSelecting = false;
  let initialized = false;
  let session = null;

  let markerGeometry = null;
  let markerMaterial = null;
  let marker = null;
  let lineGeometry = null;
  let lineMaterial = null;
  let rayLine = null;
  let controller = null;
  let markerVisibleUntil = 0;
  let markerPulseActive = false;

  function getFloorIntersectionFromRay(origin, direction) {
    raycaster.ray.origin.copy(origin);
    raycaster.ray.direction.copy(direction);

    const meshes = [];
    sceneRoots.traverse((child) => {
      if (child.isMesh) {
        meshes.push(child);
      }
    });

    const intersects = raycaster.intersectObjects(meshes, false);

    for (const hit of intersects) {
      if (!hit.face?.normal) {
        continue;
      }

      worldNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
      if (worldNormal.dot(upVector) < MIN_FLOOR_DOT) {
        continue;
      }

      return hit;
    }

    return null;
  }

  function getFloorIntersection() {
    if (!controller) {
      return null;
    }

    controller.updateMatrixWorld(true);
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    const origin = new Vector3().setFromMatrixPosition(controller.matrixWorld);
    const direction = new Vector3(0, 0, -1).applyMatrix4(tempMatrix).normalize();
    return getFloorIntersectionFromRay(origin, direction);
  }

  function syncTeleportTarget() {
    const hit = getFloorIntersection();
    if (!hit) {
      intersection = null;
      marker.visible = false;
      rayLine.scale.z = 10;
      return false;
    }

    intersection = hit.point.clone();
    marker.position.copy(intersection);
    marker.position.y += 0.01;
    marker.scale.setScalar(1);
    marker.visible = true;
    markerMaterial.opacity = TELEPORT_MARKER_BASE_OPACITY;
    rayLine.scale.z = hit.distance;
    return true;
  }

  function ensureSceneObjects() {
    if (initialized) {
      return;
    }

    initialized = true;

    markerGeometry = new RingGeometry(0.15, 0.2, 48).rotateX(-Math.PI / 2);
    markerMaterial = new MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: TELEPORT_MARKER_BASE_OPACITY,
      depthWrite: false,
    });
    marker = new Mesh(markerGeometry, markerMaterial);
    marker.visible = false;
    marker.renderOrder = 10_000;
    scene.add(marker);

    lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute(
      "position",
      new Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3),
    );
    lineMaterial = new LineBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    rayLine = new Line(lineGeometry, lineMaterial);
    rayLine.visible = false;
    rayLine.scale.z = 10;

    controller = renderer.xr.getController(0);
    controller.add(rayLine);
    scene.add(controller);

    controller.addEventListener("selectstart", onSelectStart);
    controller.addEventListener("select", onSelect);
    controller.addEventListener("selectend", onSelectEnd);
  }

  function teleportTo(targetPoint) {
    const currentReferenceSpace = renderer.xr.getReferenceSpace();
    if (!currentReferenceSpace) {
      return;
    }

    const xrCamera = renderer.xr.getCamera();
    xrCamera.updateMatrixWorld(true);
    xrCamera.getWorldPosition(viewerPosition);

    const offsetPosition = {
      x: viewerPosition.x - targetPoint.x,
      y: 0,
      z: viewerPosition.z - targetPoint.z,
      w: 1,
    };
    const offsetRotation = new DOMPoint(0, 0, 0, 1);
    const transform = new XRRigidTransform(offsetPosition, offsetRotation);
    const teleportSpace = currentReferenceSpace.getOffsetReferenceSpace(transform);
    renderer.xr.setReferenceSpace(teleportSpace);
  }

  function updateTeleportTargetFromPose(origin, direction) {
    const hit = getFloorIntersectionFromRay(origin, direction);
    if (!hit) {
      intersection = null;
      if (marker) {
        marker.visible = false;
      }
      if (rayLine) {
        rayLine.scale.z = 10;
      }
      return false;
    }

    intersection = hit.point.clone();
    if (marker) {
      marker.position.copy(intersection);
      marker.position.y += 0.01;
      marker.scale.setScalar(1);
      marker.visible = true;
      markerMaterial.opacity = TELEPORT_MARKER_BASE_OPACITY;
    }
    if (rayLine) {
      rayLine.scale.z = hit.distance;
    }
    return true;
  }

  function getPoseRayFromEvent(event) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    if (!referenceSpace?.getOffsetReferenceSpace || !event?.frame || !event?.inputSource?.targetRaySpace) {
      return null;
    }

    const pose = event.frame.getPose(event.inputSource.targetRaySpace, referenceSpace);
    if (!pose) {
      return null;
    }

    const { position, orientation } = pose.transform;
    tempQuaternion.set(orientation.x, orientation.y, orientation.z, orientation.w);
    tempDirection.set(0, 0, -1).applyQuaternion(tempQuaternion).normalize();

    return {
      origin: new Vector3(position.x, position.y, position.z),
      direction: tempDirection.clone(),
    };
  }

  function onSessionSelectStart(event) {
    const ray = getPoseRayFromEvent(event);
    isSelecting = true;
    if (rayLine) {
      rayLine.visible = true;
    }
    if (!ray) {
      return;
    }

    updateTeleportTargetFromPose(ray.origin, ray.direction);
  }

  function onSessionSelect(event) {
    const ray = getPoseRayFromEvent(event);
    if (!ray) {
      return;
    }

    if (updateTeleportTargetFromPose(ray.origin, ray.direction) && intersection) {
      teleportTo(intersection);
      markerVisibleUntil = performance.now() + TELEPORT_MARKER_HOLD_MS;
      markerPulseActive = true;
    }
  }

  function onSessionSelectEnd() {
    isSelecting = false;
    if (marker && performance.now() >= markerVisibleUntil) {
      marker.visible = false;
    }
    if (rayLine) {
      rayLine.visible = false;
    }
  }

  function handleSessionStart() {
    ensureSceneObjects();
    baseReferenceSpace = renderer.xr.getReferenceSpace();
    session = renderer.xr.getSession();
    session?.addEventListener("selectstart", onSessionSelectStart);
    session?.addEventListener("select", onSessionSelect);
    session?.addEventListener("selectend", onSessionSelectEnd);
    const initialPosition = getInitialPosition?.();
    if (initialPosition) {
      teleportTo(initialPosition);
    }
  }

  function handleSessionEnd() {
    session?.removeEventListener("selectstart", onSessionSelectStart);
    session?.removeEventListener("select", onSessionSelect);
    session?.removeEventListener("selectend", onSessionSelectEnd);
    session = null;
    baseReferenceSpace = null;
    intersection = null;
    isSelecting = false;
    markerVisibleUntil = 0;
    if (marker) marker.visible = false;
    markerPulseActive = false;
    if (rayLine) rayLine.visible = false;
  }

  function onSelectStart() {
    if (session) {
      return;
    }

    isSelecting = true;
    rayLine.visible = true;
    syncTeleportTarget();
  }

  function onSelect() {
    if (!controller || !baseReferenceSpace || session) {
      return;
    }

    controller.updateMatrixWorld(true);
    if (syncTeleportTarget() && intersection) {
      teleportTo(intersection);
      markerVisibleUntil = performance.now() + TELEPORT_MARKER_HOLD_MS;
      markerPulseActive = true;
    }
  }

  function onSelectEnd() {
    if (session) {
      return;
    }

    isSelecting = false;
    if (performance.now() >= markerVisibleUntil) {
      marker.visible = false;
    }
    rayLine.visible = false;
  }

  renderer.xr.addEventListener("sessionstart", handleSessionStart);
  renderer.xr.addEventListener("sessionend", handleSessionEnd);

  function update() {
    if (!initialized) {
      return;
    }

    const now = performance.now();

    intersection = null;

    if (!isSelecting) {
      rayLine.visible = false;
      if (marker.visible && markerPulseActive && now < markerVisibleUntil) {
        const progress = 1 - ((markerVisibleUntil - now) / TELEPORT_MARKER_HOLD_MS);
        marker.scale.setScalar(1 + ((TELEPORT_MARKER_PULSE_SCALE - 1) * progress));
        markerMaterial.opacity = Math.max(0.22, TELEPORT_MARKER_BASE_OPACITY * (1 - progress * 0.65));
      } else {
        marker.visible = false;
        marker.scale.setScalar(1);
        markerMaterial.opacity = TELEPORT_MARKER_BASE_OPACITY;
        markerPulseActive = false;
      }
      return;
    }

    rayLine.visible = true;
    syncTeleportTarget();
  }

  function dispose() {
    renderer.xr.removeEventListener("sessionstart", handleSessionStart);
    renderer.xr.removeEventListener("sessionend", handleSessionEnd);

    if (!initialized) {
      return;
    }

    controller.removeEventListener("selectstart", onSelectStart);
    controller.removeEventListener("select", onSelect);
    controller.removeEventListener("selectend", onSelectEnd);
    controller.remove(rayLine);
    scene.remove(marker);
    scene.remove(controller);
    markerGeometry.dispose();
    markerMaterial.dispose();
    lineGeometry.dispose();
    lineMaterial.dispose();
  }

  return {
    update,
    dispose,
  };
}

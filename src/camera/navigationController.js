import { Box3, MathUtils, Vector3 } from "three";
import {
  buildCollisionBoxes,
  collectCollisionMeshes,
  resolvePointCollisionMovement,
  resolveWalkCollisionMovement,
} from "./collisionResolver.js";

export function createNavigationController({
  camera,
  renderer,
  viewport,
  joystickBase,
  joystickThumb,
  lookPad,
  flyUpButton,
  flyDownButton,
  boostButton,
  isTouchDevice,
  isWalkMode,
  pixelRatioCap = 2,
  viewerConfig,
  cameraMotionState,
  updateStatus,
}) {
  const keys = new Set();
  const movement = {
    baseSpeed: 1.5,
    boostMultiplier: 3.5,
  };
  const touchInput = {
    moveX: 0,
    moveZ: 0,
    moveY: 0,
    boost: false,
    joystickTouchId: null,
    lookTouchId: null,
    lastLookX: 0,
    lastLookY: 0,
  };
  const sceneMetrics = {
    bounds: new Box3(),
    center: new Vector3(),
    size: new Vector3(),
    groundY: 0,
    walkY: viewerConfig.locomotion.eyeHeight,
  };
  const collisionState = {
    roots: [],
    boxes: [],
    meshes: [],
    radius: viewerConfig.locomotion.collisionRadius ?? 0.2,
    height: viewerConfig.locomotion.collisionHeight ?? 1.75,
    skin: viewerConfig.locomotion.collisionSkin ?? 0.02,
    maxStepLength: viewerConfig.locomotion.collisionStepLength ?? 0.08,
  };
  const tmpForward = new Vector3();
  const tmpRight = new Vector3();
  const tmpUp = new Vector3();
  const velocity = new Vector3();
  const desiredMovementDelta = new Vector3();
  const resolvedMovementPosition = new Vector3();
  const tmpBox = new Box3();
  const lookState = {
    pitch: 0,
    yaw: 0,
    sensitivity: 0.002,
    minPitch: -Math.PI / 2,
    maxPitch: Math.PI / 2,
  };
  const cameraState = {
    fov: viewerConfig.camera.fov,
    height: viewerConfig.camera.height,
    lastAppliedHeight: viewerConfig.camera.height,
    ambientMotionTime: 0,
    lastOffset: new Vector3(),
    lastYawOffset: 0,
    lastPitchOffset: 0,
  };
  const pointerLockState = {
    unlockCooldownMs: 400,
    lastUnlockAt: 0,
  };

  // Плавне регулювання камери
  const smoothAdjustState = {
    heightDirection: 0,  // -1: вниз, 0: нема, 1: вгору
    heightSpeed: 1.5,    // одиниці висоти в секунду
    minHeight: 0.5,
    maxHeight: 2.5,
    minFov: 30,         // градусів
    maxFov: 110,        // градусів
    fovWheelSensitivity: 3,  // градусів за один "клік" колеса
    targetFov: cameraState.fov,  // цільове значення FOV для плавного переходу
    fovLerpFactor: 8,   // швидкість плавного переходу FOV (більше = швидше)
    zoomActive: false,
    preZoomTargetFov: null,
    zoomFovDivisor: 2,  // 2x zoom on right-click
    onHeightChanged: null,
    onFovChanged: null,
    onShowDock: null,
  };

  function getViewportDimensions() {
    return {
      width: viewport.clientWidth || window.innerWidth,
      height: viewport.clientHeight || window.innerHeight,
    };
  }

  const controls = {
    lock({ ignoreCooldown = false } = {}) {
      if (this.isLocked) {
        return;
      }

      const timeSinceUnlock = performance.now() - pointerLockState.lastUnlockAt;
      if (!ignoreCooldown && timeSinceUnlock < pointerLockState.unlockCooldownMs) {
        updateStatus("Pointer lock was just released. Click again in a moment.");
        return;
      }

      const maybePromise = renderer.domElement.requestPointerLock();
      if (maybePromise?.catch) {
        maybePromise.catch(() => {
          updateStatus("Click once more to re-capture the mouse.");
        });
      }
    },
    unlock() {
      if (this.isLocked) {
        document.exitPointerLock();
      }
    },
    get isLocked() {
      return document.pointerLockElement === renderer.domElement;
    },
  };

  function applyCameraSettings() {
    camera.fov = cameraState.fov;
    camera.updateProjectionMatrix();

    sceneMetrics.walkY = sceneMetrics.groundY + cameraState.height;
    const delta = cameraState.height - cameraState.lastAppliedHeight;
    camera.position.y += delta;
    cameraState.lastAppliedHeight = cameraState.height;
  }

  function updateSmoothAdjustments(deltaTime) {
    const { heightDirection, heightSpeed, minHeight, maxHeight, targetFov, fovLerpFactor } = smoothAdjustState;

    // Плавне регулювання висоти
    if (heightDirection !== 0) {
      const heightDelta = heightDirection * heightSpeed * deltaTime;
      const newHeight = MathUtils.clamp(
        cameraState.height + heightDelta,
        minHeight,
        maxHeight,
      );

      if (newHeight !== cameraState.height) {
        cameraState.height = newHeight;
        smoothAdjustState.onHeightChanged?.(cameraState.height);
        applyCameraSettings();
      }
    }

    // Плавний перехід FOV до цільового значення (lerp)
    const fovDiff = Math.abs(targetFov - cameraState.fov);
    if (fovDiff > 0.01) {
      const lerpAmount = fovLerpFactor * deltaTime;  // нормалізуємо по часу
      const lerpedFov = MathUtils.lerp(cameraState.fov, targetFov, lerpAmount);
      const clampedFov = MathUtils.clamp(lerpedFov, smoothAdjustState.minFov, smoothAdjustState.maxFov);

      if (clampedFov !== cameraState.fov) {
        cameraState.fov = clampedFov;
        smoothAdjustState.onFovChanged?.(cameraState.fov);
        applyCameraSettings();
      }
    }
  }

  function clearCameraAmbientMotion() {
    if (cameraState.lastOffset.lengthSq() > 0) {
      camera.position.sub(cameraState.lastOffset);
      cameraState.lastOffset.set(0, 0, 0);
    }

    if (cameraState.lastYawOffset !== 0 || cameraState.lastPitchOffset !== 0) {
      camera.rotation.y -= cameraState.lastYawOffset;
      camera.rotation.x -= cameraState.lastPitchOffset;
      cameraState.lastYawOffset = 0;
      cameraState.lastPitchOffset = 0;
    }
  }

  function applyCameraAmbientMotion(delta) {
    const ambientMotion = viewerConfig.camera.ambientMotion;
    if (!cameraMotionState.enabled || !ambientMotion) {
      return;
    }

    cameraState.ambientMotionTime += delta * ambientMotion.speed;
    const t = cameraState.ambientMotionTime;

    const offsetX = Math.sin(t * 0.83) * ambientMotion.positionX;
    const offsetY = Math.cos(t * 1.11) * ambientMotion.positionY;
    const offsetZ = Math.sin(t * 0.57 + 1.3) * ambientMotion.positionZ;

    camera.position.x += offsetX;
    camera.position.y += offsetY;
    camera.position.z += offsetZ;
    cameraState.lastOffset.set(offsetX, offsetY, offsetZ);

    const yawOffset = MathUtils.degToRad(ambientMotion.yawDegrees) * Math.sin(t * 0.41 + 0.6);
    const pitchOffset = MathUtils.degToRad(ambientMotion.pitchDegrees) * Math.cos(t * 0.52 + 1.1);

    camera.rotation.y += yawOffset;
    camera.rotation.x += pitchOffset;
    cameraState.lastYawOffset = yawOffset;
    cameraState.lastPitchOffset = pitchOffset;
  }

  function resetJoystick() {
    touchInput.moveX = 0;
    touchInput.moveZ = 0;
    touchInput.joystickTouchId = null;
    if (joystickThumb) {
      joystickThumb.style.transform = "translate(-50%, -50%) translate(0px, 0px)";
    }
  }

  function setTouchMoveY(value) {
    touchInput.moveY = value;
  }

  function setTouchBoost(active) {
    touchInput.boost = active;
    boostButton?.classList.toggle("is-active", active);
  }

  function resetMovementInputs() {
    keys.clear();
    resetJoystick();
    setTouchMoveY(0);
    setTouchBoost(false);
  }

  function updateJoystickFromTouch(touch) {
    if (!joystickBase || !joystickThumb) {
      return;
    }

    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width * 0.35;
    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);
    const clampedDistance = Math.min(distance, radius);
    const angle = Math.atan2(deltaY, deltaX);
    const moveX = Math.cos(angle) * clampedDistance;
    const moveY = Math.sin(angle) * clampedDistance;

    joystickThumb.style.transform = `translate(-50%, -50%) translate(${moveX}px, ${moveY}px)`;
    touchInput.moveX = MathUtils.clamp(moveX / radius, -1, 1);
    touchInput.moveZ = MathUtils.clamp(-moveY / radius, -1, 1);
  }

  function applyLookDelta(deltaX, deltaY) {
    lookState.yaw -= deltaX * lookState.sensitivity;
    lookState.pitch = MathUtils.clamp(
      lookState.pitch - deltaY * lookState.sensitivity,
      lookState.minPitch,
      lookState.maxPitch,
    );
    applyLookState();
  }

  function syncLookStateFromCamera() {
    lookState.pitch = camera.rotation.x;
    lookState.yaw = camera.rotation.y;
  }

  function applyLookState() {
    camera.rotation.order = "YXZ";
    camera.rotation.x = lookState.pitch;
    camera.rotation.y = lookState.yaw;
  }

  function clampSpeed(nextSpeed) {
    movement.baseSpeed = MathUtils.clamp(nextSpeed, 1, 50);
    updateStatus(`Move speed: ${movement.baseSpeed.toFixed(1)} u/s`);
  }

  function computeSceneMetrics(root, isGameplayMesh) {
    let hasGameplayBounds = false;

    sceneMetrics.bounds.makeEmpty();

    root.traverse((child) => {
      if (!child.isMesh || !isGameplayMesh(child)) {
        return;
      }

      tmpBox.setFromObject(child);
      if (tmpBox.isEmpty()) {
        return;
      }

      if (!hasGameplayBounds) {
        sceneMetrics.bounds.copy(tmpBox);
        hasGameplayBounds = true;
        return;
      }

      sceneMetrics.bounds.union(tmpBox);
    });

    if (!hasGameplayBounds) {
      sceneMetrics.bounds.setFromObject(root);
    }

    if (sceneMetrics.bounds.isEmpty()) {
      return;
    }

    sceneMetrics.bounds.getSize(sceneMetrics.size);
    sceneMetrics.bounds.getCenter(sceneMetrics.center);
    sceneMetrics.groundY = viewerConfig.locomotion.fixedFloorY;
    sceneMetrics.walkY = sceneMetrics.groundY + cameraState.height;
  }

  function positionCameraAtSpawn(root, isGameplayMesh) {
    computeSceneMetrics(root, isGameplayMesh);
    if (sceneMetrics.bounds.isEmpty()) {
      return;
    }

    if (viewerConfig.locomotion.startPosition) {
      const startY = isWalkMode
        ? viewerConfig.locomotion.startPosition.y + cameraState.height
        : viewerConfig.locomotion.startPosition.y;

      camera.position.set(
        viewerConfig.locomotion.startPosition.x,
        startY,
        viewerConfig.locomotion.startPosition.z,
      );
    } else if (isWalkMode) {
      camera.position.set(
        sceneMetrics.center.x,
        sceneMetrics.walkY,
        sceneMetrics.center.z,
      );
    } else {
      const distance = Math.max(sceneMetrics.size.x, sceneMetrics.size.y, sceneMetrics.size.z) || 1;
      camera.position.set(
        sceneMetrics.center.x,
        sceneMetrics.center.y + Math.max(sceneMetrics.size.y * 0.1, 1.7),
        sceneMetrics.center.z + distance * 0.4,
      );
    }

    if (viewerConfig.locomotion.startLookAt) {
      camera.lookAt(
        viewerConfig.locomotion.startLookAt.x,
        viewerConfig.locomotion.startLookAt.y,
        viewerConfig.locomotion.startLookAt.z,
      );
      syncLookStateFromCamera();
    } else if (!isWalkMode) {
      camera.lookAt(sceneMetrics.center);
      syncLookStateFromCamera();
    } else {
      lookState.yaw = MathUtils.degToRad(viewerConfig.locomotion.startYawDegrees ?? 0);
      lookState.pitch = MathUtils.degToRad(viewerConfig.locomotion.startPitchDegrees ?? 0);
      applyLookState();
    }

    controls.unlock();
  }

  function positionCameraAtMarker(marker) {
    if (!marker) {
      return;
    }

    marker.updateWorldMatrix?.(true, false);
    marker.getWorldPosition(camera.position);
    marker.getWorldQuaternion(camera.quaternion);
    syncLookStateFromCamera();
    controls.unlock();
  }

  function handleResize() {
    const { width, height } = getViewportDimensions();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
    renderer.setSize(width, height);
  }

  function setCollisionRoots(roots = []) {
    collisionState.roots = roots.filter(Boolean);
    collisionState.boxes = buildCollisionBoxes(collisionState.roots);
    collisionState.meshes = collectCollisionMeshes(collisionState.roots);
  }

  function updateMovement(delta, menuOpen) {
    if (menuOpen) {
      return;
    }

    const canMove = controls.isLocked || isTouchDevice;
    if (!canMove) {
      return;
    }

    velocity.set(0, 0, 0);
    const isBoosting = keys.has("ShiftLeft") || keys.has("ShiftRight") || touchInput.boost;
    const currentSpeed = isBoosting
      ? movement.baseSpeed * movement.boostMultiplier
      : movement.baseSpeed;

    if (keys.has("KeyW")) velocity.z += 1;
    if (keys.has("KeyS")) velocity.z -= 1;
    if (keys.has("KeyA")) velocity.x -= 1;
    if (keys.has("KeyD")) velocity.x += 1;
    if (keys.has("Space")) velocity.y += 1;
    if (keys.has("KeyC")) velocity.y -= 1;

    velocity.x += touchInput.moveX;
    velocity.y += touchInput.moveY;
    velocity.z += touchInput.moveZ;

    if (isWalkMode) {
      velocity.y = 0;
    }

    if (velocity.lengthSq() === 0) {
      return;
    }

    velocity.normalize();

    if (isWalkMode) {
      tmpForward.set(-Math.sin(lookState.yaw), 0, -Math.cos(lookState.yaw));
      tmpRight.set(Math.cos(lookState.yaw), 0, -Math.sin(lookState.yaw));
    } else {
      tmpForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      tmpRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    }
    tmpUp.set(0, 1, 0);

    desiredMovementDelta.set(0, 0, 0)
      .addScaledVector(tmpForward, velocity.z * currentSpeed * delta)
      .addScaledVector(tmpRight, velocity.x * currentSpeed * delta)
      .addScaledVector(tmpUp, velocity.y * currentSpeed * delta);

    if (isWalkMode && collisionState.meshes.length) {
      const feetY = camera.position.y - cameraState.height;
      const bodyMinY = feetY + Math.max(collisionState.skin, 0.04);
      const bodyMaxY = feetY + Math.max(collisionState.height - collisionState.skin, bodyMinY + 0.2);
      resolvedMovementPosition.copy(resolveWalkCollisionMovement(
        camera.position,
        desiredMovementDelta,
        collisionState.meshes,
        {
          radius: collisionState.radius,
          bodyMinY,
          bodyMaxY,
          maxStepLength: collisionState.maxStepLength,
          skin: collisionState.skin,
        },
      ));
      camera.position.copy(resolvedMovementPosition);
      return;
    }

    if (!isWalkMode && collisionState.boxes.length) {
      resolvedMovementPosition.copy(resolvePointCollisionMovement(
        camera.position,
        desiredMovementDelta,
        collisionState.boxes,
        collisionState.maxStepLength,
      ));
      camera.position.copy(resolvedMovementPosition);
      return;
    }

    camera.position.add(desiredMovementDelta);
  }

  function bindInputEvents({
    getMenuOpen,
    onToggleMenu,
    onToggleHelp,
    onCloseMenu,
    onResumeFireVideo,
    onMoveStart,
    onCameraHeightChanged,
    onCameraFovChanged,
    onShowDock,
  }) {
    // Зберігаємо callback-функції для плавного регулювання
    smoothAdjustState.onHeightChanged = onCameraHeightChanged;
    smoothAdjustState.onFovChanged = onCameraFovChanged;
    smoothAdjustState.onShowDock = onShowDock;
    const cleanupCallbacks = [];
    const bind = (target, type, handler, options) => {
      target?.addEventListener(type, handler, options);
      cleanupCallbacks.push(() => {
        target?.removeEventListener(type, handler, options);
      });
    };

    const handleKeyDown = (event) => {
      onResumeFireVideo();

      if (event.code === "KeyM") {
        event.preventDefault();
        onToggleMenu();
        return;
      }

      if (event.code === "KeyH") {
        event.preventDefault();
        onToggleHelp();
        return;
      }

      if (event.code === "Escape" && getMenuOpen()) {
        event.preventDefault();
        onCloseMenu();
        return;
      }

      if (getMenuOpen()) {
        return;
      }

      // Плавне регулювання висоти камери
      if (event.code === "KeyQ") {
        event.preventDefault();
        smoothAdjustState.heightDirection = -1;
        return;
      }

      if (event.code === "KeyE") {
        event.preventDefault();
        smoothAdjustState.heightDirection = 1;
        return;
      }

      // Hide dock on movement keys
      const isMovementKey = ["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code);
      if (isMovementKey && onMoveStart) {
        onMoveStart();
      }

      keys.add(event.code);
    };

    const handleKeyUp = (event) => {
      // Зупиняємо плавне регулювання при відпусканні клавіш
      if (event.code === "KeyQ" || event.code === "KeyE") {
        smoothAdjustState.heightDirection = 0;
        return;
      }

      keys.delete(event.code);
    };

    function engageZoom() {
      if (smoothAdjustState.zoomActive) return;
      smoothAdjustState.zoomActive = true;
      smoothAdjustState.preZoomTargetFov = smoothAdjustState.targetFov;
      smoothAdjustState.targetFov = MathUtils.clamp(
        smoothAdjustState.targetFov / smoothAdjustState.zoomFovDivisor,
        smoothAdjustState.minFov,
        smoothAdjustState.maxFov,
      );
    }

    function disengageZoom() {
      if (!smoothAdjustState.zoomActive) return;
      smoothAdjustState.zoomActive = false;
      smoothAdjustState.targetFov = smoothAdjustState.preZoomTargetFov;
      smoothAdjustState.preZoomTargetFov = null;
    }

    const handlePointerLockChange = () => {
      if (!controls.isLocked) {
        pointerLockState.lastUnlockAt = performance.now();
        disengageZoom();
      }
    };

    bind(window, "keydown", handleKeyDown);
    bind(window, "keyup", handleKeyUp);
    bind(document, "pointerlockchange", handlePointerLockChange);

    if (!isTouchDevice) {
      const handleViewportClick = (event) => {
        if (getMenuOpen()) {
          return;
        }

        if (event.target.closest(".hud")) {
          return;
        }

        onResumeFireVideo();
        controls.lock();
      };

      bind(viewport, "click", handleViewportClick);
    }

    const handleMouseMove = (event) => {
      if (!controls.isLocked || getMenuOpen()) {
        return;
      }

      applyLookDelta(event.movementX, event.movementY);
    };

    const handleFocus = () => {
      onResumeFireVideo();
    };

    const handleBlur = () => {
      resetMovementInputs();
      disengageZoom();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        onResumeFireVideo();
      }
    };

    const handleMouseDown = (event) => {
      if (event.button !== 2 || !controls.isLocked || getMenuOpen()) return;
      engageZoom();
    };

    const handleMouseUp = (event) => {
      if (event.button !== 2) return;
      disengageZoom();
    };

    const handleContextMenu = (event) => {
      event.preventDefault();
    };

    bind(window, "mousemove", handleMouseMove);
    bind(window, "mousedown", handleMouseDown);
    bind(window, "mouseup", handleMouseUp);
    bind(viewport, "contextmenu", handleContextMenu);
    bind(window, "focus", handleFocus);
    bind(window, "blur", handleBlur);
    bind(document, "visibilitychange", handleVisibilityChange);

    if (isTouchDevice) {
      viewport.classList.add("is-touch");

      const handleJoystickTouchStart = (event) => {
        const [touch] = event.changedTouches;
        if (!touch || touchInput.joystickTouchId !== null) {
          return;
        }

        touchInput.joystickTouchId = touch.identifier;
        updateJoystickFromTouch(touch);
        event.preventDefault();
      };

      const handleJoystickTouchMove = (event) => {
        const touch = [...event.changedTouches].find((item) => item.identifier === touchInput.joystickTouchId);
        if (!touch) {
          return;
        }

        updateJoystickFromTouch(touch);
        event.preventDefault();
      };

      const releaseJoystick = (event) => {
        const touch = [...event.changedTouches].find((item) => item.identifier === touchInput.joystickTouchId);
        if (!touch) {
          return;
        }

        resetJoystick();
        event.preventDefault();
      };

      bind(joystickBase, "touchstart", handleJoystickTouchStart, { passive: false });
      bind(joystickBase, "touchmove", handleJoystickTouchMove, { passive: false });
      bind(joystickBase, "touchend", releaseJoystick, { passive: false });
      bind(joystickBase, "touchcancel", releaseJoystick, { passive: false });

      const handleLookTouchStart = (event) => {
        const [touch] = event.changedTouches;
        if (!touch || touchInput.lookTouchId !== null) {
          return;
        }

        touchInput.lookTouchId = touch.identifier;
        touchInput.lastLookX = touch.clientX;
        touchInput.lastLookY = touch.clientY;
        event.preventDefault();
      };

      const handleLookTouchMove = (event) => {
        const touch = [...event.changedTouches].find((item) => item.identifier === touchInput.lookTouchId);
        if (!touch) {
          return;
        }

        const deltaX = touch.clientX - touchInput.lastLookX;
        const deltaY = touch.clientY - touchInput.lastLookY;
        touchInput.lastLookX = touch.clientX;
        touchInput.lastLookY = touch.clientY;
        applyLookDelta(deltaX, deltaY);
        event.preventDefault();
      };

      const releaseLook = (event) => {
        const touch = [...event.changedTouches].find((item) => item.identifier === touchInput.lookTouchId);
        if (!touch) {
          return;
        }

        touchInput.lookTouchId = null;
        touchInput.lastLookX = 0;
        touchInput.lastLookY = 0;
        event.preventDefault();
      };

      bind(lookPad, "touchstart", handleLookTouchStart, { passive: false });
      bind(lookPad, "touchmove", handleLookTouchMove, { passive: false });
      bind(lookPad, "touchend", releaseLook, { passive: false });
      bind(lookPad, "touchcancel", releaseLook, { passive: false });

      const bindHoldButton = (element, onStart, onEnd) => {
        if (!element) {
          return;
        }

        const start = (event) => {
          onStart();
          element.classList.add("is-active");
          event.preventDefault();
        };
        const end = (event) => {
          onEnd();
          element.classList.remove("is-active");
          event.preventDefault();
        };

        bind(element, "touchstart", start, { passive: false });
        bind(element, "touchend", end, { passive: false });
        bind(element, "touchcancel", end, { passive: false });
      };

      bindHoldButton(flyUpButton, () => setTouchMoveY(1), () => setTouchMoveY(0));
      bindHoldButton(flyDownButton, () => setTouchMoveY(-1), () => setTouchMoveY(0));
      bindHoldButton(boostButton, () => setTouchBoost(true), () => setTouchBoost(false));
    }

    const handleWheel = (event) => {
      if (getMenuOpen()) {
        return;
      }

      if (event.shiftKey) {
        // FOV регулювання: прокрутка вниз (deltaY > 0) -> менше FOV, вгору -> більше FOV
        // Змінюємо ЦІЛЬОВЕ значення, а не поточне — поточне плавно підтягнеться
        const fovChange = event.deltaY > 0 ? -smoothAdjustState.fovWheelSensitivity : smoothAdjustState.fovWheelSensitivity;
        const newTargetFov = MathUtils.clamp(
          smoothAdjustState.targetFov + fovChange,
          smoothAdjustState.minFov,
          smoothAdjustState.maxFov,
        );

        if (newTargetFov !== smoothAdjustState.targetFov) {
          smoothAdjustState.targetFov = newTargetFov;
          smoothAdjustState.onShowDock?.();  // показуємо dock при зміні
        }
        return;
      }

      const delta = event.deltaY > 0 ? -0.75 : 0.75;
      clampSpeed(movement.baseSpeed + delta);
    };

    bind(window, "wheel", handleWheel, { passive: true });

    return () => {
      cleanupCallbacks.forEach((cleanup) => {
        cleanup();
      });
      cleanupCallbacks.length = 0;
      resetMovementInputs();
    };
  }

  return {
    cameraState,
    controls,
    applyCameraSettings,
    clearCameraAmbientMotion,
    applyCameraAmbientMotion,
    applyLookState,
    bindInputEvents,
    handleResize,
    positionCameraAtMarker,
    positionCameraAtSpawn,
    resetMovementInputs,
    setCollisionRoots,
    syncLookStateFromCamera,
    updateMovement,
    updateSmoothAdjustments,
  };
}

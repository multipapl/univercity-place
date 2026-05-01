import * as THREE from "three";

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
    bounds: new THREE.Box3(),
    center: new THREE.Vector3(),
    size: new THREE.Vector3(),
    groundY: 0,
    walkY: viewerConfig.locomotion.eyeHeight,
  };
  const tmpForward = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();
  const tmpUp = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const tmpBox = new THREE.Box3();
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
    lastOffset: new THREE.Vector3(),
    lastYawOffset: 0,
    lastPitchOffset: 0,
  };
  const pointerLockState = {
    unlockCooldownMs: 400,
    lastUnlockAt: 0,
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

    const yawOffset = THREE.MathUtils.degToRad(ambientMotion.yawDegrees) * Math.sin(t * 0.41 + 0.6);
    const pitchOffset = THREE.MathUtils.degToRad(ambientMotion.pitchDegrees) * Math.cos(t * 0.52 + 1.1);

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
    touchInput.moveX = THREE.MathUtils.clamp(moveX / radius, -1, 1);
    touchInput.moveZ = THREE.MathUtils.clamp(-moveY / radius, -1, 1);
  }

  function applyLookDelta(deltaX, deltaY) {
    lookState.yaw -= deltaX * lookState.sensitivity;
    lookState.pitch = THREE.MathUtils.clamp(
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
    movement.baseSpeed = THREE.MathUtils.clamp(nextSpeed, 1, 50);
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
      lookState.yaw = THREE.MathUtils.degToRad(viewerConfig.locomotion.startYawDegrees ?? 0);
      lookState.pitch = THREE.MathUtils.degToRad(viewerConfig.locomotion.startPitchDegrees ?? 0);
      applyLookState();
    }

    controls.unlock();
  }

  function handleResize() {
    const { width, height } = getViewportDimensions();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
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

    camera.position
      .addScaledVector(tmpForward, velocity.z * currentSpeed * delta)
      .addScaledVector(tmpRight, velocity.x * currentSpeed * delta)
      .addScaledVector(tmpUp, velocity.y * currentSpeed * delta);
  }

  function bindInputEvents({
    getMenuOpen,
    onToggleMenu,
    onCloseMenu,
    onResumeFireVideo,
  }) {
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

      if (event.code === "Escape" && getMenuOpen()) {
        event.preventDefault();
        onCloseMenu();
        return;
      }

      if (getMenuOpen()) {
        return;
      }

      keys.add(event.code);
    };

    const handleKeyUp = (event) => {
      keys.delete(event.code);
    };

    const handlePointerLockChange = () => {
      if (!controls.isLocked) {
        pointerLockState.lastUnlockAt = performance.now();
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
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        onResumeFireVideo();
      }
    };

    bind(window, "mousemove", handleMouseMove);
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

      const delta = event.deltaY > 0 ? -0.75 : 0.75;
      clampSpeed(movement.baseSpeed + delta);
    };

    bind(window, "wheel", handleWheel, { passive: true });
    bind(window, "resize", handleResize);

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
    positionCameraAtSpawn,
    resetMovementInputs,
    syncLookStateFromCamera,
    updateMovement,
  };
}

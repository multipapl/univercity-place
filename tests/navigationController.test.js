import test from "node:test";
import assert from "node:assert/strict";

import { createNavigationController } from "../src/camera/navigationController.js";

class FakeEventTarget {
  constructor({ closestResult = null } = {}) {
    this.closestResult = closestResult;
    this.listeners = new Map();
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    this.listeners.get(type).add(handler);
  }

  removeEventListener(type, handler) {
    this.listeners.get(type)?.delete(handler);
  }

  dispatchEvent(event) {
    Object.defineProperty(event, "target", {
      configurable: true,
      value: this,
    });

    this.listeners.get(event.type)?.forEach((handler) => {
      handler(event);
    });

    return true;
  }

  closest() {
    return this.closestResult;
  }
}

function createBaseViewerConfig() {
  return {
    camera: {
      fov: 60,
      height: 1.7,
      ambientMotion: {
        enabled: false,
        speed: 1,
        positionX: 0,
        positionY: 0,
        positionZ: 0,
      },
    },
    locomotion: {
      mode: "walk",
      eyeHeight: 1.7,
      collisionRadius: 0.2,
      collisionHeight: 1.75,
      collisionSkin: 0.02,
      collisionStepLength: 0.08,
    },
  };
}

function createCamera() {
  return {
    fov: 60,
    position: {
      x: 0,
      y: 0,
      z: 0,
      add() {},
      sub() {},
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },
    updateProjectionMatrix() {},
  };
}

test("viewport click closes the menu and re-locks controls when picker mode is inactive", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const windowTarget = new FakeEventTarget();
  const documentTarget = new FakeEventTarget();
  let lockCalls = 0;
  let closeCalls = 0;
  let resumeCalls = 0;

  globalThis.window = {
    addEventListener: windowTarget.addEventListener.bind(windowTarget),
    removeEventListener: windowTarget.removeEventListener.bind(windowTarget),
    innerWidth: 1280,
    innerHeight: 720,
  };
  globalThis.document = {
    addEventListener: documentTarget.addEventListener.bind(documentTarget),
    removeEventListener: documentTarget.removeEventListener.bind(documentTarget),
    exitPointerLock() {},
    pointerLockElement: null,
  };

  try {
    const viewport = new FakeEventTarget();
    const rendererDomElement = {
      requestPointerLock() {
        lockCalls += 1;
      },
    };
    const navigationController = createNavigationController({
      camera: createCamera(),
      renderer: {
        domElement: rendererDomElement,
      },
      getEffectivePixelRatio: () => 1,
      viewport,
      joystickBase: null,
      joystickThumb: null,
      lookPad: null,
      flyUpButton: null,
      flyDownButton: null,
      boostButton: null,
      isTouchDevice: false,
      isWalkMode: true,
      viewerConfig: createBaseViewerConfig(),
      cameraMotionState: {
        enabled: false,
      },
      updateStatus() {},
    });

    const unbind = navigationController.bindInputEvents({
      getMenuOpen: () => true,
      getMenuMovementAllowed: () => false,
      onToggleMenu() {},
      onToggleHelp() {},
      onCloseMenu() {
        closeCalls += 1;
      },
      onResumeFireVideo() {
        resumeCalls += 1;
      },
      onMoveStart() {},
      onCameraHeightChanged() {},
      onCameraFovChanged() {},
      onShowDock() {},
    });

    viewport.dispatchEvent(new Event("click"));

    assert.equal(closeCalls, 1);
    assert.equal(resumeCalls, 1);
    assert.equal(lockCalls, 1);

    unbind();
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});

test("viewport click keeps the menu open while picker mode is active", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const windowTarget = new FakeEventTarget();
  const documentTarget = new FakeEventTarget();
  let lockCalls = 0;
  let closeCalls = 0;

  globalThis.window = {
    addEventListener: windowTarget.addEventListener.bind(windowTarget),
    removeEventListener: windowTarget.removeEventListener.bind(windowTarget),
    innerWidth: 1280,
    innerHeight: 720,
  };
  globalThis.document = {
    addEventListener: documentTarget.addEventListener.bind(documentTarget),
    removeEventListener: documentTarget.removeEventListener.bind(documentTarget),
    exitPointerLock() {},
    pointerLockElement: null,
  };

  try {
    const viewport = new FakeEventTarget();
    const navigationController = createNavigationController({
      camera: createCamera(),
      renderer: {
        domElement: {
          requestPointerLock() {
            lockCalls += 1;
          },
        },
      },
      getEffectivePixelRatio: () => 1,
      viewport,
      joystickBase: null,
      joystickThumb: null,
      lookPad: null,
      flyUpButton: null,
      flyDownButton: null,
      boostButton: null,
      isTouchDevice: false,
      isWalkMode: true,
      viewerConfig: createBaseViewerConfig(),
      cameraMotionState: {
        enabled: false,
      },
      updateStatus() {},
    });

    const unbind = navigationController.bindInputEvents({
      getMenuOpen: () => true,
      getMenuMovementAllowed: () => true,
      onToggleMenu() {},
      onToggleHelp() {},
      onCloseMenu() {
        closeCalls += 1;
      },
      onResumeFireVideo() {},
      onMoveStart() {},
      onCameraHeightChanged() {},
      onCameraFovChanged() {},
      onShowDock() {},
    });

    viewport.dispatchEvent(new Event("click"));

    assert.equal(closeCalls, 0);
    assert.equal(lockCalls, 0);

    unbind();
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});

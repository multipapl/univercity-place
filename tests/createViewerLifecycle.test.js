import test from "node:test";
import assert from "node:assert/strict";

import { createViewerLifecycle } from "../src/viewer/createViewerLifecycle.js";

test("createViewerLifecycle pauses scene updates outside active render mode", () => {
  const calls = [];
  let nextAnimationFrameId = 0;
  let queuedAnimationFrame = null;
  let queuedTimeout = null;
  let renderMode = "active";
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const windowListeners = new Map();
  const documentListeners = new Map();

  globalThis.window = {
    addEventListener(type, handler) {
      windowListeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (windowListeners.get(type) === handler) {
        windowListeners.delete(type);
      }
    },
    requestAnimationFrame(callback) {
      queuedAnimationFrame = callback;
      nextAnimationFrameId += 1;
      return nextAnimationFrameId;
    },
    cancelAnimationFrame() {
      queuedAnimationFrame = null;
    },
    setTimeout(callback) {
      queuedTimeout = callback;
      return 1;
    },
    clearTimeout() {
      queuedTimeout = null;
    },
  };
  globalThis.document = {
    addEventListener(type, handler) {
      documentListeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (documentListeners.get(type) === handler) {
        documentListeners.delete(type);
      }
    },
  };

  const lifecycle = createViewerLifecycle({
    clock: {
      getDelta() {
        return 0.016;
      },
    },
    state: {
      diagnosticsState: {
        frameAccumulator: 0,
        frameCounter: 0,
      },
      viewerLifecycle: {
        animationFrameId: null,
        timeoutId: null,
        disposed: false,
        renderMode: "active",
        renderRequested: false,
        started: false,
      },
    },
    uiController: {
      clearCameraAmbientMotion() {
        calls.push("clear-ambient");
      },
      updateBackgroundMotion() {
        calls.push("background-motion");
      },
      applyCameraAmbientMotion() {
        calls.push("camera-ambient");
      },
      syncPostProcessingSize() {
        calls.push("resize");
      },
    },
    navigationController: {
      handleResize() {
        calls.push("nav-resize");
      },
      resetMovementInputs() {
        calls.push("reset-input");
      },
      updateMovement() {
        calls.push("move");
      },
      updateSmoothAdjustments() {
        calls.push("smooth");
      },
    },
    sceneLayerLoader: {
      setFireVideoPlaybackEnabled(enabled) {
        calls.push(`fire:${enabled ? "on" : "off"}`);
      },
      syncFireVideoPlayback() {
        calls.push("fire-sync");
      },
    },
    getRenderMode() {
      return renderMode;
    },
    renderSceneFrame(delta) {
      calls.push(`render:${delta.toFixed(3)}`);
    },
    updatePerformanceDiagnostics() {
      calls.push("diagnostics");
    },
    disposeRuntimeResources() {
      calls.push("dispose");
    },
  });

  try {
    lifecycle.start();
    assert.ok(queuedAnimationFrame);

    queuedAnimationFrame();
    assert.deepEqual(calls.slice(0, 6), [
      "clear-ambient",
      "fire-sync",
      "background-motion",
      "move",
      "smooth",
      "camera-ambient",
    ]);
    assert.ok(calls.includes("render:0.016"));

    calls.length = 0;
    renderMode = "paused";
    lifecycle.syncRenderMode();
    assert.ok(queuedTimeout);

    queuedTimeout();
    assert.deepEqual(calls, [
      "reset-input",
      "fire:off",
      "clear-ambient",
      "render:0.000",
    ]);

    calls.length = 0;
    lifecycle.requestRender();
    queuedTimeout();
    assert.deepEqual(calls, [
      "clear-ambient",
      "render:0.000",
    ]);

    calls.length = 0;
    renderMode = "active";
    windowListeners.get("focus")?.();
    assert.ok(queuedAnimationFrame);

    queuedAnimationFrame();
    assert.deepEqual(calls.slice(0, 2), [
      "fire:on",
      "clear-ambient",
    ]);
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});

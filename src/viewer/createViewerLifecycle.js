export function createViewerLifecycle({
  clock,
  state,
  uiController,
  navigationController,
  sceneLayerLoader,
  getRenderMode,
  renderSceneFrame,
  updatePerformanceDiagnostics,
  disposeRuntimeResources,
}) {
  function clearScheduledTick() {
    if (state.viewerLifecycle.animationFrameId !== null) {
      window.cancelAnimationFrame(state.viewerLifecycle.animationFrameId);
      state.viewerLifecycle.animationFrameId = null;
    }

    if (state.viewerLifecycle.timeoutId !== null) {
      window.clearTimeout(state.viewerLifecycle.timeoutId);
      state.viewerLifecycle.timeoutId = null;
    }
  }

  function scheduleTick() {
    if (!state.viewerLifecycle.started || state.viewerLifecycle.disposed) {
      return;
    }

    if (state.viewerLifecycle.renderMode === "active") {
      if (state.viewerLifecycle.animationFrameId === null) {
        state.viewerLifecycle.animationFrameId = window.requestAnimationFrame(tick);
      }
      return;
    }

    if (state.viewerLifecycle.timeoutId === null) {
      state.viewerLifecycle.timeoutId = window.setTimeout(tick, 0);
    }
  }

  function renderActiveFrame(delta) {
    uiController.clearCameraAmbientMotion();
    sceneLayerLoader.syncFireVideoPlayback();
    uiController.updateBackgroundMotion(delta);
    navigationController.updateMovement(delta, false);
    navigationController.updateSmoothAdjustments(delta);
    uiController.applyCameraAmbientMotion(delta);
    renderSceneFrame(delta);
    state.diagnosticsState.frameAccumulator += delta;
    state.diagnosticsState.frameCounter += 1;

    if (state.diagnosticsState.frameAccumulator >= 0.25) {
      state.diagnosticsState.fps = state.diagnosticsState.frameCounter / state.diagnosticsState.frameAccumulator;
      state.diagnosticsState.frameMs =
        (state.diagnosticsState.frameAccumulator / state.diagnosticsState.frameCounter) * 1000;
      state.diagnosticsState.frameAccumulator = 0;
      state.diagnosticsState.frameCounter = 0;
      updatePerformanceDiagnostics();
    }
  }

  function renderPausedFrame() {
    uiController.clearCameraAmbientMotion();
    renderSceneFrame(0);
  }

  function tick() {
    if (state.viewerLifecycle.disposed) {
      return;
    }

    state.viewerLifecycle.animationFrameId = null;
    state.viewerLifecycle.timeoutId = null;
    syncRenderMode();

    if (state.viewerLifecycle.renderMode === "active") {
      const delta = clock.getDelta();
      renderActiveFrame(delta);
      scheduleTick();
      return;
    }

    clock.getDelta();
    if (state.viewerLifecycle.renderRequested) {
      state.viewerLifecycle.renderRequested = false;
      renderPausedFrame();
    }
  }

  function handleResize() {
    navigationController.handleResize();
    uiController.syncPostProcessingSize();
    requestRender();
  }

  function syncRenderMode() {
    const nextRenderMode = getRenderMode();
    if (state.viewerLifecycle.renderMode === nextRenderMode) {
      return;
    }

    clearScheduledTick();
    state.viewerLifecycle.renderMode = nextRenderMode;
    state.viewerLifecycle.renderRequested = true;
    state.diagnosticsState.frameAccumulator = 0;
    state.diagnosticsState.frameCounter = 0;
    clock.getDelta();

    if (nextRenderMode === "active") {
      sceneLayerLoader.setFireVideoPlaybackEnabled(true);
      scheduleTick();
      return;
    }

    navigationController.resetMovementInputs();
    sceneLayerLoader.setFireVideoPlaybackEnabled(false);
    clearScheduledTick();
    scheduleTick();
  }

  function requestRender() {
    state.viewerLifecycle.renderRequested = true;
    scheduleTick();
  }

  function start() {
    if (state.viewerLifecycle.disposed || state.viewerLifecycle.started) {
      return;
    }

    state.viewerLifecycle.started = true;
    window.addEventListener("resize", handleResize);
    state.viewerLifecycle.renderRequested = true;
    syncRenderMode();
    scheduleTick();
  }

  function stop() {
    if (!state.viewerLifecycle.started) {
      return;
    }

    state.viewerLifecycle.started = false;
    window.removeEventListener("resize", handleResize);
    clearScheduledTick();
  }

  function dispose() {
    if (state.viewerLifecycle.disposed) {
      return;
    }

    state.viewerLifecycle.disposed = true;
    stop();
    disposeRuntimeResources?.();
  }

  return {
    requestRender,
    syncRenderMode,
    start,
    stop,
    dispose,
    handleResize,
  };
}

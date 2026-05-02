export function createViewerLifecycle({
  clock,
  state,
  uiController,
  navigationController,
  menuController,
  sceneLayerLoader,
  renderSceneFrame,
  updatePerformanceDiagnostics,
  disposeRuntimeResources,
}) {
  function tick() {
    if (state.viewerLifecycle.disposed) {
      return;
    }

    const delta = clock.getDelta();
    uiController.clearCameraAmbientMotion();
    sceneLayerLoader.syncFireVideoPlayback();
    uiController.updateBackgroundMotion(delta);
    navigationController.updateMovement(delta, menuController.isOpen());
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

    state.viewerLifecycle.animationFrameId = window.requestAnimationFrame(tick);
  }

  function handleResize() {
    navigationController.handleResize();
    uiController.syncPostProcessingSize();
  }

  function start() {
    if (state.viewerLifecycle.disposed || state.viewerLifecycle.started) {
      return;
    }

    state.viewerLifecycle.started = true;
    window.addEventListener("resize", handleResize);
    state.viewerLifecycle.animationFrameId = window.requestAnimationFrame(tick);
  }

  function stop() {
    if (!state.viewerLifecycle.started) {
      return;
    }

    state.viewerLifecycle.started = false;
    window.removeEventListener("resize", handleResize);

    if (state.viewerLifecycle.animationFrameId !== null) {
      window.cancelAnimationFrame(state.viewerLifecycle.animationFrameId);
      state.viewerLifecycle.animationFrameId = null;
    }
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
    start,
    stop,
    dispose,
    handleResize,
  };
}

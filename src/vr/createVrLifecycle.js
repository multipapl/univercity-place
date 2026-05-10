export function createVrLifecycle({
  renderer,
  scene,
  camera,
  clock,
  viewport,
  viewerLifecycleController,
  navigationController,
  sceneLayerLoader,
  uiController,
  onBeforeRender,
}) {
  let savedCameraPosition = null;
  let savedCameraQuaternion = null;

  function hideAllDomUi() {
    const elements = viewport.querySelectorAll(
      ".hud, .loading-screen, .control-dock, .crosshair, .mobile-controls, .menu-sidebar, .help-overlay, .gallery-overlay",
    );

    elements.forEach((element) => {
      element.dataset.vrHidden = element.style.display || "";
      element.style.display = "none";
    });
  }

  function showAllDomUi() {
    const elements = viewport.querySelectorAll("[data-vr-hidden]");

    elements.forEach((element) => {
      element.style.display = element.dataset.vrHidden;
      delete element.dataset.vrHidden;
    });
  }

  function vrRenderFrame() {
    const delta = clock.getDelta();

    onBeforeRender?.(delta);
    sceneLayerLoader.syncFireVideoPlayback();
    uiController.updateBackgroundMotion(delta);
    renderer.render(scene, camera);
  }

  function enterVr() {
    viewerLifecycleController.stop();
    navigationController.controls.unlock();
    navigationController.resetMovementInputs();
    hideAllDomUi();
    savedCameraPosition = camera.position.clone();
    savedCameraQuaternion = camera.quaternion.clone();
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    clock.getDelta();
    renderer.setAnimationLoop(vrRenderFrame);
  }

  function exitVr() {
    renderer.setAnimationLoop(null);

    if (savedCameraPosition) {
      camera.position.copy(savedCameraPosition);
      savedCameraPosition = null;
    }
    if (savedCameraQuaternion) {
      camera.quaternion.copy(savedCameraQuaternion);
      savedCameraQuaternion = null;
      navigationController.syncLookStateFromCamera();
    }

    showAllDomUi();
    clock.getDelta();
    viewerLifecycleController.start();
    viewerLifecycleController.handleResize();
  }

  function dispose() {
    renderer.setAnimationLoop(null);
  }

  return {
    enterVr,
    exitVr,
    dispose,
  };
}

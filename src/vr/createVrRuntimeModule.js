import { createVrLifecycle } from "./createVrLifecycle.js";
import { createVrNavigation } from "./createVrNavigation.js";
import { createVrSession } from "./createVrSession.js";

export function createVrRuntimeModule({
  runtimeConfig,
  renderer,
  viewport,
  scene,
  sceneRoots,
  camera,
  clock,
  viewerLifecycleController,
  navigationController,
  sceneLayerLoader,
  uiController,
  cameraMotionState,
}) {
  let savedFloorPosition = null;
  let savedCameraMotionEnabled = cameraMotionState.enabled;
  let presenting = false;

  const vrNavigation = createVrNavigation({
    renderer,
    scene,
    sceneRoots,
    getInitialPosition: () => savedFloorPosition,
  });
  const vrLifecycle = createVrLifecycle({
    renderer,
    scene,
    camera,
    clock,
    viewport,
    viewerLifecycleController,
    navigationController,
    sceneLayerLoader,
    uiController,
    onBeforeRender: (delta) => {
      vrNavigation.update(delta);
    },
  });
  const vrSession = createVrSession({
    renderer,
    viewport,
    sessionInit: {
      optionalFeatures: runtimeConfig.session.optionalFeatures,
    },
    xrFramebufferScaleFactor: runtimeConfig.session.framebufferScaleFactor,
    xrFoveation: runtimeConfig.session.foveation,
    onBeforeSessionStart: () => {
      uiController.clearCameraAmbientMotion();
      savedCameraMotionEnabled = cameraMotionState.enabled;
      cameraMotionState.enabled = false;
      uiController.applyCameraMotionSettings();
      savedFloorPosition = camera.position.clone();
      savedFloorPosition.y -= navigationController.cameraState.height;
    },
    onSessionStart: () => {
      presenting = true;
      vrLifecycle.enterVr();
    },
    onSessionEnd: () => {
      presenting = false;
      cameraMotionState.enabled = savedCameraMotionEnabled;
      uiController.applyCameraMotionSettings();
      vrLifecycle.exitVr();
    },
  });

  function init() {
    return vrSession.init();
  }

  function dispose() {
    vrNavigation.dispose();
    vrLifecycle.dispose();
    vrSession.dispose();
  }

  function isPresenting() {
    return presenting || vrSession.isPresenting();
  }

  return {
    init,
    dispose,
    isPresenting,
  };
}

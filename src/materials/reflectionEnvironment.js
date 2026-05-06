import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { disposeObjectTree } from "../utils/threeDisposal.js";

export function createReflectionEnvironmentManager({
  reflectionPmremGenerator,
  scene,
}) {
  const state = {
    envTarget: null,
    envTexture: null,
    probeEnvironmentManager: null,
  };

  function buildFallbackReflectionEnvironment() {
    const reflectionEnvironmentScene = new RoomEnvironment();
    const reflectionEnvironmentTarget = reflectionPmremGenerator.fromScene(reflectionEnvironmentScene, 0.04);
    disposeObjectTree(reflectionEnvironmentScene);
    return reflectionEnvironmentTarget;
  }

  function ensureFallbackEnvironment() {
    if (state.envTexture) {
      return state.envTexture;
    }

    const target = buildFallbackReflectionEnvironment();
    state.envTarget = target;
    state.envTexture = target.texture;

    if (!state.probeEnvironmentManager?.hasProbes()) {
      scene.environment = state.envTexture;
    }

    return state.envTexture;
  }

  function getEnvironmentMap() {
    return state.envTexture ?? scene.environment ?? null;
  }

  function getClosestEnvMap(meshWorldPosition) {
    if (state.probeEnvironmentManager?.hasProbes()) {
      return state.probeEnvironmentManager.getClosestEnvMap(meshWorldPosition);
    }
    return getEnvironmentMap();
  }

  function setProbeEnvironmentManager(probeManager) {
    state.probeEnvironmentManager = probeManager;
  }

  function dispose() {
    state.probeEnvironmentManager?.dispose();
    state.probeEnvironmentManager = null;
    scene.environment = null;
    state.envTarget?.dispose();
    state.envTarget = null;
    state.envTexture = null;
  }

  return {
    dispose,
    ensureFallbackEnvironment,
    getEnvironmentMap,
    getClosestEnvMap,
    setProbeEnvironmentManager,
  };
}

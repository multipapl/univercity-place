import { EquirectangularReflectionMapping, SRGBColorSpace } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { resolveAssetContract } from "../loaders/assetResolver.js";
import { disposeObjectTree } from "../utils/threeDisposal.js";

export function createReflectionEnvironmentManager({
  viewerConfig,
  searchParams,
  assetQuery = "",
  reflectionPmremGenerator,
  scene,
  textureLoader,
  updateStatus,
}) {
  const state = {
    envUrl: null,
    envTarget: null,
    envTexture: null,
  };

  function buildFallbackReflectionEnvironment() {
    const reflectionEnvironmentScene = new RoomEnvironment();
    const reflectionEnvironmentTarget = reflectionPmremGenerator.fromScene(reflectionEnvironmentScene, 0.04);
    disposeObjectTree(reflectionEnvironmentScene);
    return reflectionEnvironmentTarget;
  }

  function setEnvironmentTarget(nextTarget) {
    if (state.envTarget === nextTarget) {
      return;
    }

    state.envTarget?.dispose();
    state.envTarget = nextTarget;
    state.envTexture = nextTarget?.texture ?? null;
    scene.environment = state.envTexture;
  }

  async function ensureEnvironment() {
    if (state.envTexture) {
      return state.envTexture;
    }

    if (!state.envUrl) {
      state.envUrl = resolveAssetContract(
        viewerConfig.assets.reflectEnvironment,
        searchParams,
        assetQuery,
      ).url;
    }

    if (!state.envUrl) {
      setEnvironmentTarget(buildFallbackReflectionEnvironment());
      return state.envTexture;
    }

    try {
      const equirectTexture = await textureLoader.loadAsync(state.envUrl);
      equirectTexture.colorSpace = SRGBColorSpace;
      equirectTexture.mapping = EquirectangularReflectionMapping;
      equirectTexture.needsUpdate = true;

      const reflectionEnvironmentTarget = reflectionPmremGenerator.fromEquirectangular(equirectTexture);
      equirectTexture.dispose();
      setEnvironmentTarget(reflectionEnvironmentTarget);
      updateStatus(`Reflection environment loaded from ${state.envUrl}.`);
      return state.envTexture;
    } catch (error) {
      console.warn(`Failed to load reflection environment from ${state.envUrl}.`, error);
      setEnvironmentTarget(buildFallbackReflectionEnvironment());
      return state.envTexture;
    }
  }

  function getEnvironmentMap() {
    return state.envTexture ?? scene.environment ?? null;
  }

  function dispose() {
    scene.environment = null;
    state.envTarget?.dispose();
    state.envTarget = null;
    state.envTexture = null;
  }

  return {
    dispose,
    ensureEnvironment,
    getEnvironmentMap,
  };
}

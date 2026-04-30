import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { resolveOptionalAssetUrl } from "../loaders/assetResolver.js";

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
    envTexture: null,
  };

  function buildFallbackReflectionEnvironment() {
    const reflectionEnvironmentScene = new RoomEnvironment();
    const reflectionEnvironmentTarget = reflectionPmremGenerator.fromScene(reflectionEnvironmentScene, 0.04);
    const reflectionEnvironmentMap = reflectionEnvironmentTarget.texture;
    reflectionEnvironmentScene.dispose();
    return reflectionEnvironmentMap;
  }

  async function ensureEnvironment() {
    if (state.envTexture) {
      return state.envTexture;
    }

    if (!state.envUrl) {
      state.envUrl = await resolveOptionalAssetUrl(
        searchParams,
        viewerConfig.materialPresets.reflectMaterial.searchParam,
        viewerConfig.materialPresets.reflectMaterial.candidates,
        assetQuery,
      );
    }

    if (!state.envUrl) {
      state.envTexture = buildFallbackReflectionEnvironment();
      scene.environment = state.envTexture;
      return state.envTexture;
    }

    try {
      const equirectTexture = await textureLoader.loadAsync(state.envUrl);
      equirectTexture.colorSpace = THREE.SRGBColorSpace;
      equirectTexture.mapping = THREE.EquirectangularReflectionMapping;
      equirectTexture.needsUpdate = true;

      const reflectionEnvironmentTarget = reflectionPmremGenerator.fromEquirectangular(equirectTexture);
      equirectTexture.dispose();
      state.envTexture = reflectionEnvironmentTarget.texture;
      scene.environment = state.envTexture;
      updateStatus(`Reflection environment loaded from ${state.envUrl}.`);
      return state.envTexture;
    } catch (error) {
      console.warn(`Failed to load reflection environment from ${state.envUrl}.`, error);
      state.envTexture = buildFallbackReflectionEnvironment();
      scene.environment = state.envTexture;
      return state.envTexture;
    }
  }

  function getEnvironmentMap() {
    return state.envTexture ?? scene.environment ?? null;
  }

  return {
    ensureEnvironment,
    getEnvironmentMap,
  };
}

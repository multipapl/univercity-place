import { Color } from "three";
import { createDebugMaterialOverrides } from "./debugMaterialOverrides.js";
import { describeMaterialTarget } from "./debugMaterialTargeting.js";
import { makeAlphaCutoutMaterial } from "./factories/makeAlphaCutoutMaterial.js";
import { makeBackgroundMaterial } from "./factories/makeBackgroundMaterial.js";
import { makeBakedMaterial } from "./factories/makeBakedMaterial.js";
import { makeEmissiveMaterial } from "./factories/makeEmissiveMaterial.js";
import { makeFxMaterial } from "./factories/makeFxMaterial.js";
import { makeGlassMaterial } from "./factories/makeGlassMaterial.js";
import { makeReflectMaterial } from "./factories/makeReflectMaterial.js";
import { makeUnlitAlphaMaterial } from "./factories/makeUnlitAlphaMaterial.js";
import { makeWindowsMaterial } from "./factories/makeWindowsMaterial.js";
import { createFireVideoMaterialPatchApplier } from "./shaderPatches/applyFireVideoMaterialPatch.js";
import { createTranslucencyPatchApplier } from "./shaderPatches/applyTranslucencyPatch.js";
import { createViewerMaterialPatchApplier } from "./shaderPatches/applyViewerMaterialPatches.js";
import { createTextureUtils } from "./textureUtils.js";

export function createMaterialPipeline({
  viewerConfig,
  maxSupportedAnisotropy,
  backgroundState,
  fireState,
  reflectionState,
  reflectionEnvironment,
}) {
  const disposedSourceMaterials = new WeakSet();

  function matchesNameIncludes(name, includes = []) {
    const normalized = `${name ?? ""}`.toLowerCase();
    return includes.some((token) => normalized.includes(token.toLowerCase()));
  }

  function findMaterialTweak(mesh, sourceMaterial) {
    return viewerConfig.materialTweaks.find((tweak) => {
      const materialMatch = matchesNameIncludes(sourceMaterial?.name, tweak.materialNameIncludes);
      const meshMatch = matchesNameIncludes(mesh?.name, tweak.meshNameIncludes);
      return materialMatch || meshMatch;
    }) ?? null;
  }

  function getMaterialCompileHookState(material) {
    if (material.userData.viewerCompileHookState) {
      return material.userData.viewerCompileHookState;
    }

    const state = {
      baseHook: typeof material.onBeforeCompile === "function" ? material.onBeforeCompile : null,
      baseCustomProgramCacheKey:
        typeof material.customProgramCacheKey === "function"
          ? material.customProgramCacheKey.bind(material)
          : (() => ""),
      hooks: new Map(),
    };

    material.userData.viewerCompileHookState = state;
    material.onBeforeCompile = (shader, renderer) => {
      material.userData.viewerCompiledShader = shader;
      if (typeof state.baseHook === "function") {
        state.baseHook(shader, renderer);
      }

      state.hooks.forEach((hook) => {
        hook(shader, renderer);
      });
    };
    material.customProgramCacheKey = () => {
      const hookSignature = [...state.hooks.keys()].sort().join(",");
      return `${state.baseCustomProgramCacheKey()}|viewerHooks:${hookSignature}`;
    };

    return state;
  }

  function setMaterialCompileHook(material, key, hook) {
    const state = getMaterialCompileHookState(material);
    if (hook) {
      state.hooks.set(key, hook);
    } else {
      state.hooks.delete(key);
    }
    material.needsUpdate = true;
  }

  const {
    applyTextureChannelOverride,
    getTextureDimensions,
    normalizeDataTexture,
    normalizeTexture,
    tuneBakedTexture,
    tuneFoliageTexture,
  } = createTextureUtils({
    viewerConfig,
    maxSupportedAnisotropy,
  });

  const {
    applyDebugColorCorrection,
    canApplyDebugColorCorrection,
    clearDebugColorCorrection,
  } = createDebugMaterialOverrides({
    getMaterialCompileHookState,
    setMaterialCompileHook,
  });

  const applyViewerMaterialPatches = createViewerMaterialPatchApplier({
    setMaterialCompileHook,
  });
  const applyFireVideoMaterialPatch = createFireVideoMaterialPatchApplier({
    viewerConfig,
    fireState,
    setMaterialCompileHook,
  });
  const applyTranslucencyPatch = createTranslucencyPatchApplier({
    setMaterialCompileHook,
  });

  const translucencyState = {
    sunDirection: null,
  };

  function getMaterialTexture(source) {
    return normalizeTexture(source.map || source.emissiveMap || null);
  }

  function getMaterialColorTexture(source) {
    return normalizeTexture(source.map || null);
  }

  function getMaterialAlphaTexture(source) {
    return normalizeDataTexture(source.alphaMap || source.roughnessMap || null);
  }

  function getMaterialRoughnessTexture(source) {
    return normalizeDataTexture(source.roughnessMap || null);
  }

  function getMaterialMetalnessTexture(source) {
    return normalizeDataTexture(source.metalnessMap || null);
  }

  function getMaterialNormalTexture(source) {
    return normalizeDataTexture(source.normalMap || null);
  }

  function getMaterialAoTexture(source) {
    return normalizeDataTexture(source.aoMap || null);
  }

  function getMaterialTint(source, hasTexture) {
    return hasTexture
      ? new Color(0xffffff)
      : (source.color ? source.color.clone() : new Color(0xffffff));
  }

  function looksLikeAdditiveFx(mesh, source) {
    const label = `${mesh?.name ?? ""} ${source?.name ?? ""}`.toLowerCase();
    return ["fire", "flame", "glow", "ember"].some((token) => label.includes(token));
  }

  function matchesFireVideoTarget(mesh, material) {
    const label = `${mesh?.name ?? ""} ${material?.userData?.sourceMaterialName ?? material?.name ?? ""}`.toLowerCase();
    return viewerConfig.materialPresets.fireVideo.matchIncludes.some((token) => label.includes(token));
  }

  function stampViewerMaterialData(material, source, tweak) {
    material.toneMapped = true;
    material.userData.sourceMaterialName = source.name || "";
    material.userData.viewerTweakId = tweak?.id || null;
  }

  function getUvChannelAvailability(mesh) {
    return {
      uv: Boolean(mesh.geometry?.getAttribute("uv")),
      uv1: Boolean(mesh.geometry?.getAttribute("uv1")),
      uv2: Boolean(mesh.geometry?.getAttribute("uv2")),
      uv3: Boolean(mesh.geometry?.getAttribute("uv3")),
    };
  }

  function getFallbackTextureChannel(mesh, preferredChannel) {
    const availability = getUvChannelAvailability(mesh);
    const preferredAttributeName = preferredChannel === 0
      ? "uv"
      : `uv${preferredChannel}`;

    if (availability[preferredAttributeName]) {
      return preferredChannel;
    }

    if (availability.uv) {
      return 0;
    }

    return null;
  }

  function makeViewerMaterial(sourceMaterial, mesh, materialMode) {
    switch (materialMode) {
      case "background":
        return makeBackgroundMaterial({
          viewerConfig,
          backgroundState,
          sourceMaterial,
          getMaterialTexture,
          getMaterialTint,
        });
      case "unlitAlpha":
        return makeUnlitAlphaMaterial({
          sourceMaterial,
          getMaterialTexture,
          getMaterialAlphaTexture,
          getMaterialTint,
          normalizeTexture,
          normalizeDataTexture,
        });
      case "alphaCutout":
        return makeAlphaCutoutMaterial({
          viewerConfig,
          sourceMaterial,
          mesh,
          findMaterialTweak,
          getMaterialTexture,
          getMaterialAlphaTexture,
          getMaterialTint,
          getFallbackTextureChannel,
          applyTextureChannelOverride,
          tuneFoliageTexture,
          stampViewerMaterialData,
          applyViewerMaterialPatches,
          applyTranslucencyPatch,
          translucencyConfig: viewerConfig.materialPresets.translucency,
          translucencySunDirection: translucencyState.sunDirection,
        });
      case "glass":
        return makeGlassMaterial({
          viewerConfig,
          reflectionEnvironment,
          sourceMaterial,
          mesh,
          findMaterialTweak,
          getMaterialTexture,
          getMaterialNormalTexture,
          getMaterialRoughnessTexture,
          getMaterialTint,
          getFallbackTextureChannel,
          applyTextureChannelOverride,
          stampViewerMaterialData,
          applyViewerMaterialPatches,
        });
      case "reflect":
        return makeReflectMaterial({
          viewerConfig,
          reflectionState,
          reflectionEnvironment,
          sourceMaterial,
          mesh,
          findMaterialTweak,
          getMaterialColorTexture,
          getMaterialRoughnessTexture,
          getMaterialMetalnessTexture,
          getMaterialNormalTexture,
          getMaterialAoTexture,
          getMaterialTint,
          getFallbackTextureChannel,
          applyTextureChannelOverride,
          stampViewerMaterialData,
          applyViewerMaterialPatches,
          normalizeTexture,
        });
      case "windows":
        return makeWindowsMaterial({
          viewerConfig,
          reflectionEnvironment,
          sourceMaterial,
          mesh,
          findMaterialTweak,
          stampViewerMaterialData,
          applyViewerMaterialPatches,
        });
      case "emissive":
        return makeEmissiveMaterial({
          viewerConfig,
          sourceMaterial,
          mesh,
          findMaterialTweak,
          stampViewerMaterialData,
          applyViewerMaterialPatches,
        });
      case "fx":
        return makeFxMaterial({
          viewerConfig,
          sourceMaterial,
          mesh,
          findMaterialTweak,
          getMaterialTexture,
          getMaterialAlphaTexture,
          getMaterialTint,
          getFallbackTextureChannel,
          applyTextureChannelOverride,
          looksLikeAdditiveFx,
          stampViewerMaterialData,
          applyViewerMaterialPatches,
        });
      case "baked":
      default:
        return makeBakedMaterial({
          sourceMaterial,
          mesh,
          findMaterialTweak,
          getMaterialTexture,
          getMaterialTint,
          stampViewerMaterialData,
          applyViewerMaterialPatches,
          tuneBakedTexture,
        });
    }
  }

  function disposeSourceMaterial(material) {
    if (!material?.isMaterial || disposedSourceMaterials.has(material)) {
      return;
    }

    disposedSourceMaterials.add(material);
    material.dispose();
  }

  function convertMeshForLayer(mesh, materialMode) {
    const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const nextMaterials = sourceMaterials.map((material) => makeViewerMaterial(material, mesh, materialMode));

    mesh.material = Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0];
    sourceMaterials.forEach(disposeSourceMaterial);

    mesh.castShadow = false;
    mesh.receiveShadow = false;
    if (mesh.geometry && !mesh.geometry.boundingSphere) {
      mesh.geometry.computeBoundingSphere();
    }
    mesh.frustumCulled = !["background", "unlitAlpha"].includes(materialMode)
      && viewerConfig.runtimeOptimization.frustumCulling;

    if (materialMode === "background") {
      mesh.onBeforeRender = (_renderer, _scene, _camera, _geometry, renderMaterial) => {
        const uniforms = renderMaterial?.userData?.viewerBackgroundShader?.uniforms;
        if (!uniforms) {
          return;
        }

        uniforms.viewerBackgroundHue.value = backgroundState.hueDegrees / 360;
        uniforms.viewerBackgroundSaturation.value = backgroundState.saturation;
        uniforms.viewerBackgroundValue.value = backgroundState.value;
      };
      mesh.renderOrder = -1000;
      return;
    }

    if (materialMode === "unlitAlpha") {
      mesh.renderOrder = -900;
    }
  }

  function tuneBaseLayerEntryTextures(entry) {
    if (!entry.layer.runtime?.applyBaseTextureOptimizations) {
      return;
    }

    const seenTextures = new Set();
    entry.root.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        ["map", "emissiveMap"].forEach((key) => {
          const texture = material?.[key];
          if (!texture?.isTexture || seenTextures.has(texture.id)) {
            return;
          }

          seenTextures.add(texture.id);
          tuneBakedTexture(texture);
        });
      });
    });
  }

  function applyRuntimeTextureOptimizations(loadedLayers) {
    loadedLayers.forEach((entry) => {
      tuneBaseLayerEntryTextures(entry);
    });
  }

  function isGameplayMesh(mesh) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    return !materials.some((material) => {
      const tweakId = material?.userData?.viewerTweakId;
      const tweak = viewerConfig.materialTweaks.find((entry) => entry.id === tweakId);
      return tweak?.excludeFromGameplayBounds;
    });
  }

  return {
    applyDebugColorCorrection,
    applyFireVideoMaterialPatch,
    applyTextureChannelOverride,
    applyRuntimeTextureOptimizations,
    canApplyDebugColorCorrection,
    clearDebugColorCorrection,
    convertMeshForLayer,
    describeMaterialTarget,
    getFallbackTextureChannel,
    getTextureDimensions,
    isGameplayMesh,
    matchesFireVideoTarget,
    setTranslucencySunDirection(direction) {
      translucencyState.sunDirection = direction;
    },
  };
}

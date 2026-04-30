import * as THREE from "three";

export function createMaterialPipeline({
  viewerConfig,
  maxSupportedAnisotropy,
  backgroundState,
  fireState,
  reflectionState,
  reflectionEnvironment,
}) {
  const DEBUG_COLOR_DEFAULTS = Object.freeze({
    hue: 0,
    saturation: 1,
    value: 1,
    gamma: 1,
  });

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

  function getUvAttributeName(channel) {
    return channel === 0 ? "uv" : `uv${channel}`;
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

  function normalizeDebugColorOverride(override = {}) {
    return {
      hue: Number.isFinite(override.hue) ? override.hue : DEBUG_COLOR_DEFAULTS.hue,
      saturation: Number.isFinite(override.saturation) ? override.saturation : DEBUG_COLOR_DEFAULTS.saturation,
      value: Number.isFinite(override.value) ? override.value : DEBUG_COLOR_DEFAULTS.value,
      gamma: Number.isFinite(override.gamma) ? override.gamma : DEBUG_COLOR_DEFAULTS.gamma,
    };
  }

  function isDefaultDebugColorOverride(override = {}) {
    return Math.abs((override.hue ?? 0) - DEBUG_COLOR_DEFAULTS.hue) < 0.0001
      && Math.abs((override.saturation ?? 1) - DEBUG_COLOR_DEFAULTS.saturation) < 0.0001
      && Math.abs((override.value ?? 1) - DEBUG_COLOR_DEFAULTS.value) < 0.0001
      && Math.abs((override.gamma ?? 1) - DEBUG_COLOR_DEFAULTS.gamma) < 0.0001;
  }

  function syncDebugColorUniforms(material) {
    const uniforms = material.userData.viewerDebugColorUniforms;
    const override = material.userData.viewerDebugColorOverride;
    if (!uniforms || !override) {
      return;
    }

    uniforms.viewerDebugHue.value = override.hue / 360;
    uniforms.viewerDebugSaturation.value = override.saturation;
    uniforms.viewerDebugValue.value = override.value;
    uniforms.viewerDebugGamma.value = override.gamma;
  }

  function applyViewerMaterialPatches(material, { tweak = null, alphaFromMapChannel = null } = {}) {
    const hasTweak = Boolean(tweak)
      && (Number.isFinite(tweak.brightness) || Number.isFinite(tweak.saturation));
    const hasSeparateAlphaFromMap = Number.isInteger(alphaFromMapChannel) && alphaFromMapChannel >= 0;

    if (!hasTweak && !hasSeparateAlphaFromMap) {
      return;
    }

    const brightness = hasTweak && Number.isFinite(tweak.brightness) ? tweak.brightness : 1;
    const saturation = hasTweak && Number.isFinite(tweak.saturation) ? tweak.saturation : 1;
    const alphaUvAttributeName = hasSeparateAlphaFromMap
      ? getUvAttributeName(alphaFromMapChannel)
      : null;

    setMaterialCompileHook(material, "viewerMaterialPatch", (shader) => {
      if (hasTweak) {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `#include <common>
vec3 viewerAdjustSaturation(vec3 color, float saturation) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(luma), color, saturation);
}`,
        );
      }

      if (hasSeparateAlphaFromMap) {
        shader.uniforms.viewerAlphaUvTransform = {
          value: material.map?.matrix ?? new THREE.Matrix3(),
        };

        shader.vertexShader = shader.vertexShader.replace(
          "#include <uv_pars_vertex>",
          `#include <uv_pars_vertex>
attribute vec2 ${alphaUvAttributeName};
varying vec2 vViewerAlphaUv;
uniform mat3 viewerAlphaUvTransform;`,
        );

        shader.vertexShader = shader.vertexShader.replace(
          "#include <uv_vertex>",
          `#include <uv_vertex>
vViewerAlphaUv = ( viewerAlphaUvTransform * vec3( ${alphaUvAttributeName}, 1.0 ) ).xy;`,
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <uv_pars_fragment>",
          `#include <uv_pars_fragment>
varying vec2 vViewerAlphaUv;`,
        );
      }

      let mapFragmentReplacement = "#include <map_fragment>";

      if (hasSeparateAlphaFromMap) {
        mapFragmentReplacement = `#ifdef USE_MAP
vec4 sampledDiffuseColor = texture2D( map, vMapUv );
diffuseColor.rgb *= sampledDiffuseColor.rgb;
diffuseColor.a *= texture2D( map, vViewerAlphaUv ).a;
#endif`;
      }

      if (hasTweak) {
        mapFragmentReplacement += `
diffuseColor.rgb = viewerAdjustSaturation(diffuseColor.rgb, ${saturation.toFixed(3)});
diffuseColor.rgb *= ${brightness.toFixed(3)};`;
      }

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        mapFragmentReplacement,
      );
    });
  }

  function applyGlassMaterialPatch(material, {
    centerOpacity,
    edgeOpacity,
    power,
    edgeTintStrength,
  } = {}) {
    setMaterialCompileHook(material, "viewerGlassPatch", (shader) => {
      shader.uniforms.viewerGlassCenterOpacity = { value: centerOpacity };
      shader.uniforms.viewerGlassEdgeOpacity = { value: edgeOpacity };
      shader.uniforms.viewerGlassPower = { value: power };
      shader.uniforms.viewerGlassEdgeTintStrength = { value: edgeTintStrength };

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `#include <common>
varying vec3 vViewerViewPosition;
varying vec3 vViewerNormal;`,
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `#include <project_vertex>
vViewerViewPosition = -mvPosition.xyz;
vViewerNormal = normalize( normalMatrix * normal );`,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
varying vec3 vViewerViewPosition;
varying vec3 vViewerNormal;
uniform float viewerGlassCenterOpacity;
uniform float viewerGlassEdgeOpacity;
uniform float viewerGlassPower;
uniform float viewerGlassEdgeTintStrength;

float viewerGlassFresnel(vec3 normal, vec3 viewDir, float power) {
  return pow(1.0 - abs(dot(normal, viewDir)), power);
}`,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <specularmap_fragment>",
        `#include <specularmap_fragment>
vec3 viewerGlassNormal = normalize( vViewerNormal );
vec3 viewerGlassViewDir = normalize( vViewerViewPosition );
float viewerGlassFresnelValue = viewerGlassFresnel( viewerGlassNormal, viewerGlassViewDir, viewerGlassPower );
float viewerGlassOpacityValue = mix( viewerGlassCenterOpacity, viewerGlassEdgeOpacity, viewerGlassFresnelValue );
diffuseColor.a *= viewerGlassOpacityValue;`,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "vec3 outgoingLight = reflectedLight.indirectDiffuse;",
        `vec3 outgoingLight = reflectedLight.indirectDiffuse;
outgoingLight = mix( outgoingLight, vec3( 1.0 ), viewerGlassFresnelValue * viewerGlassEdgeTintStrength );`,
      );
    });
  }

  function normalizeTexture(texture) {
    if (!texture) {
      return texture;
    }

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.needsUpdate = true;

    return texture;
  }

  function normalizeDataTexture(texture) {
    if (!texture) {
      return texture;
    }

    texture.colorSpace = THREE.NoColorSpace;
    texture.flipY = false;
    texture.needsUpdate = true;

    return texture;
  }

  function tuneFoliageTexture(texture) {
    if (!texture) {
      return texture;
    }

    if (viewerConfig.materialPresets.foliageDisableMipmaps) {
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
    } else {
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
    }

    texture.anisotropy = Math.min(
      viewerConfig.materialPresets.foliageAnisotropy ?? 1,
      maxSupportedAnisotropy || 1,
    );

    if (viewerConfig.materialPresets.foliagePremultiplyAlpha) {
      texture.premultiplyAlpha = true;
    }

    texture.needsUpdate = true;
    return texture;
  }

  function getTextureDimensions(image) {
    if (!image) {
      return { width: 0, height: 0 };
    }

    return {
      width: image.videoWidth || image.naturalWidth || image.width || 0,
      height: image.videoHeight || image.naturalHeight || image.height || 0,
    };
  }

  function applyTextureSizeCap(texture, maxSize = 0) {
    if (!texture) {
      return texture;
    }

    const sourceImage = texture.userData.viewerOriginalImage || texture.image;
    if (!sourceImage) {
      return texture;
    }

    if (!texture.userData.viewerOriginalImage) {
      texture.userData.viewerOriginalImage = sourceImage;
    }

    const { width, height } = getTextureDimensions(sourceImage);
    if (!width || !height) {
      return texture;
    }

    if (!maxSize || Math.max(width, height) <= maxSize) {
      if (texture.image !== sourceImage) {
        texture.image = sourceImage;
        texture.needsUpdate = true;
      }
      return texture;
    }

    const scale = maxSize / Math.max(width, height);
    const nextWidth = Math.max(1, Math.round(width * scale));
    const nextHeight = Math.max(1, Math.round(height * scale));
    const currentImage = texture.image;
    const currentDimensions = getTextureDimensions(currentImage);
    if (currentImage
      && currentImage !== sourceImage
      && currentDimensions.width === nextWidth
      && currentDimensions.height === nextHeight) {
      return texture;
    }

    const canvas = document.createElement("canvas");
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return texture;
    }

    context.drawImage(sourceImage, 0, 0, nextWidth, nextHeight);
    texture.image = canvas;
    texture.needsUpdate = true;
    return texture;
  }

  function tuneBakedTexture(texture) {
    if (!texture) {
      return texture;
    }

    applyTextureSizeCap(texture, viewerConfig.runtimeOptimization.baseTextureMaxSize);

    if (viewerConfig.runtimeOptimization.lowMemoryBaseMipmaps) {
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
    } else {
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
    }

    texture.needsUpdate = true;
    return texture;
  }

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
      ? new THREE.Color(0xffffff)
      : (source.color ? source.color.clone() : new THREE.Color(0xffffff));
  }

  function looksLikeAdditiveFx(mesh, source) {
    const label = `${mesh?.name ?? ""} ${source?.name ?? ""}`.toLowerCase();
    return ["fire", "flame", "glow", "ember"].some((token) => label.includes(token));
  }

  function matchesFireVideoTarget(mesh, material) {
    const label = `${mesh?.name ?? ""} ${material?.userData?.sourceMaterialName ?? material?.name ?? ""}`.toLowerCase();
    return viewerConfig.materialPresets.fireVideo.matchIncludes.some((token) => label.includes(token));
  }

  function applyFireVideoMaterialPatch(material) {
    const fireVideoPreset = viewerConfig.materialPresets.fireVideo;
    const hasAlphaMap = Boolean(material.alphaMap);
    const blackPoint = fireVideoPreset.blackPoint.toFixed(3);
    const whitePoint = fireVideoPreset.whitePoint.toFixed(3);
    const brightnessBoost = fireVideoPreset.brightnessBoost.toFixed(3);

    setMaterialCompileHook(material, "viewerFireVideoPatch", (shader) => {
      const fireUniforms = {
        viewerFireHue: { value: fireState.hueDegrees / 360 },
        viewerFireSaturation: { value: fireState.saturation },
        viewerFireValue: { value: fireState.value },
      };
      Object.assign(shader.uniforms, fireUniforms);
      material.userData.viewerFireUniforms = fireUniforms;

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
float viewerFireLuma(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}
uniform float viewerFireHue;
uniform float viewerFireSaturation;
uniform float viewerFireValue;

vec3 viewerFireRgbToHsv(vec3 color) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(color.bg, K.wz), vec4(color.gb, K.xy), step(color.b, color.g));
  vec4 q = mix(vec4(p.xyw, color.r), vec4(color.r, p.yzx), step(p.x, color.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 viewerFireHsvToRgb(vec3 color) {
  vec3 rgb = clamp(abs(mod(color.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return color.z * mix(vec3(1.0), rgb, color.y);
}`,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
vec4 sampledDiffuseColor = texture2D( map, vMapUv );
float viewerFireMask = smoothstep(${blackPoint}, ${whitePoint}, viewerFireLuma(sampledDiffuseColor.rgb));
vec3 viewerFireHsv = viewerFireRgbToHsv(sampledDiffuseColor.rgb);
viewerFireHsv.x = fract(viewerFireHsv.x + viewerFireHue);
viewerFireHsv.y = clamp(viewerFireHsv.y * viewerFireSaturation, 0.0, 2.0);
viewerFireHsv.z = clamp(viewerFireHsv.z * viewerFireValue, 0.0, 2.0);
vec3 viewerFireColor = viewerFireHsvToRgb(viewerFireHsv);
diffuseColor.rgb *= viewerFireColor * ${brightnessBoost};
diffuseColor.a *= viewerFireMask;
#endif`,
      );

      if (hasAlphaMap) {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <alphamap_fragment>",
          `#ifdef USE_ALPHAMAP
diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,
        );
      }
    });

    fireState.materials.add(material);
  }

  function stampViewerMaterialData(material, source, tweak) {
    material.toneMapped = true;
    material.userData.sourceMaterialName = source.name || "";
    material.userData.viewerTweakId = tweak?.id || null;
  }

  function describeMaterialTarget(mesh, material) {
    return {
      layerId: mesh?.userData?.viewerLayerId || material?.userData?.viewerLayerId || "",
      meshName: mesh?.name || "",
      materialName: material?.userData?.sourceMaterialName || material?.name || "",
    };
  }

  function canApplyDebugColorCorrection(material) {
    return Boolean(material?.isMaterial) && !material?.isShaderMaterial;
  }

  function clearDebugColorCorrection(material) {
    if (!material?.isMaterial) {
      return;
    }

    delete material.userData.viewerDebugColorOverride;
    delete material.userData.viewerDebugColorUniforms;
    setMaterialCompileHook(material, "viewerDebugColorCorrection", null);
  }

  function applyDebugColorCorrection(material, override) {
    if (!canApplyDebugColorCorrection(material)) {
      return false;
    }

    const normalizedOverride = normalizeDebugColorOverride(override);
    if (isDefaultDebugColorOverride(normalizedOverride)) {
      clearDebugColorCorrection(material);
      return false;
    }

    const hookState = getMaterialCompileHookState(material);
    const hasExistingHook = hookState.hooks.has("viewerDebugColorCorrection");
    material.userData.viewerDebugColorOverride = normalizedOverride;
    if (!hasExistingHook) {
      setMaterialCompileHook(material, "viewerDebugColorCorrection", (shader) => {
        const uniforms = material.userData.viewerDebugColorUniforms ?? {
          viewerDebugHue: { value: normalizedOverride.hue / 360 },
          viewerDebugSaturation: { value: normalizedOverride.saturation },
          viewerDebugValue: { value: normalizedOverride.value },
          viewerDebugGamma: { value: normalizedOverride.gamma },
        };

        shader.uniforms.viewerDebugHue = uniforms.viewerDebugHue;
        shader.uniforms.viewerDebugSaturation = uniforms.viewerDebugSaturation;
        shader.uniforms.viewerDebugValue = uniforms.viewerDebugValue;
        shader.uniforms.viewerDebugGamma = uniforms.viewerDebugGamma;
        material.userData.viewerDebugColorUniforms = uniforms;

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `#include <common>
uniform float viewerDebugHue;
uniform float viewerDebugSaturation;
uniform float viewerDebugValue;
uniform float viewerDebugGamma;

vec3 viewerDebugRgbToHsv(vec3 color) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(color.bg, K.wz), vec4(color.gb, K.xy), step(color.b, color.g));
  vec4 q = mix(vec4(p.xyw, color.r), vec4(color.r, p.yzx), step(p.x, color.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 viewerDebugHsvToRgb(vec3 color) {
  vec3 rgb = clamp(abs(mod(color.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return color.z * mix(vec3(1.0), rgb, color.y);
}

vec3 viewerDebugApplyColorCorrection(vec3 color) {
  vec3 hsv = viewerDebugRgbToHsv(max(color, vec3(0.0)));
  hsv.x = fract(hsv.x + viewerDebugHue);
  hsv.y = clamp(hsv.y * viewerDebugSaturation, 0.0, 2.0);
  hsv.z = clamp(hsv.z * viewerDebugValue, 0.0, 4.0);
  vec3 corrected = viewerDebugHsvToRgb(hsv);
  return pow(max(corrected, vec3(0.0)), vec3(max(viewerDebugGamma, 0.0001)));
}`,
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <colorspace_fragment>",
          `gl_FragColor.rgb = viewerDebugApplyColorCorrection(gl_FragColor.rgb);
#include <colorspace_fragment>`,
        );
      });
    }

    syncDebugColorUniforms(material);
    return true;
  }

  function applyTextureChannelOverride(texture, fallbackChannel) {
    if (!texture || !Number.isInteger(fallbackChannel) || fallbackChannel < 0) {
      return texture;
    }

    texture.channel = fallbackChannel;
    texture.needsUpdate = true;

    return texture;
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

  function makeBakedMaterial(sourceMaterial, mesh) {
    const source = sourceMaterial ?? {};
    const map = getMaterialTexture(source);
    const hasTexture = Boolean(map);
    const hasEmissiveMap = Boolean(source.emissiveMap);
    const tintColor = getMaterialTint(source, hasTexture);
    const tweak = findMaterialTweak(mesh, source);

    tuneBakedTexture(map);

    const material = new THREE.MeshBasicMaterial({
      name: source.name || "BakedMaterial",
      map,
      color: tintColor,
      transparent: Boolean(source.transparent),
      opacity: source.opacity ?? 1,
      alphaTest: source.alphaTest ?? 0,
      side: source.side ?? (hasEmissiveMap ? THREE.DoubleSide : THREE.FrontSide),
      vertexColors: Boolean(source.vertexColors),
    });

    stampViewerMaterialData(material, source, tweak);
    applyViewerMaterialPatches(material, { tweak });

    return material;
  }

  function makeAlphaCutoutMaterial(sourceMaterial, mesh) {
    const source = sourceMaterial ?? {};
    const map = getMaterialTexture(source);
    const alphaMap = getMaterialAlphaTexture(source);
    const hasTexture = Boolean(map);
    const tweak = findMaterialTweak(mesh, source);
    const colorChannel = getFallbackTextureChannel(
      mesh,
      viewerConfig.materialPresets.alphaCutoutUvChannels.color,
    );
    const alphaChannel = getFallbackTextureChannel(
      mesh,
      viewerConfig.materialPresets.alphaCutoutUvChannels.alpha,
    );
    const useSeparateAlphaFromMap = !alphaMap
      && Boolean(map)
      && colorChannel !== null
      && alphaChannel !== null
      && colorChannel !== alphaChannel
      && viewerConfig.materialPresets.useFallbackMapAlphaFromSeparateUv;

    applyTextureChannelOverride(map, colorChannel);
    applyTextureChannelOverride(alphaMap, alphaChannel);
    tuneFoliageTexture(map);
    tuneFoliageTexture(alphaMap);

    const material = new THREE.MeshBasicMaterial({
      name: source.name || "AlphaCutoutMaterial",
      map,
      alphaMap,
      color: getMaterialTint(source, hasTexture),
      transparent: false,
      opacity: source.opacity ?? 1,
      alphaTest: source.alphaTest || viewerConfig.materialPresets.alphaCutoff,
      side: THREE.DoubleSide,
      vertexColors: Boolean(source.vertexColors),
    });
    material.alphaToCoverage = true;
    material.premultipliedAlpha = viewerConfig.materialPresets.foliagePremultiplyAlpha;

    stampViewerMaterialData(material, source, tweak);
    material.userData.viewerUvChannels = {
      color: map?.channel ?? null,
      alpha: alphaMap?.channel ?? alphaChannel ?? null,
      alphaSource: source.alphaMap
        ? "alphaMap"
        : (source.roughnessMap ? "roughnessMap" : (useSeparateAlphaFromMap ? "mapAlpha" : "none")),
    };
    applyViewerMaterialPatches(material, {
      tweak,
      alphaFromMapChannel: useSeparateAlphaFromMap ? alphaChannel : null,
    });

    return material;
  }

  function makeGlassMaterial(sourceMaterial, mesh) {
    const source = sourceMaterial ?? {};
    const map = getMaterialTexture(source);
    const hasTexture = Boolean(map);
    const tweak = findMaterialTweak(mesh, source);
    const opacityScale = source.transparent
      ? (source.opacity ?? 1)
      : 1;
    const fresnelPreset = viewerConfig.materialPresets.glassFresnel;
    const material = new THREE.MeshBasicMaterial({
      name: source.name || "GlassMaterial",
      map,
      color: getMaterialTint(source, hasTexture),
      transparent: true,
      opacity: 1,
      alphaTest: source.alphaTest || viewerConfig.materialPresets.glassAlphaCutoff,
      side: THREE.DoubleSide,
      depthWrite: false,
      vertexColors: Boolean(source.vertexColors),
    });

    stampViewerMaterialData(material, source, tweak);
    applyGlassMaterialPatch(material, {
      centerOpacity: Math.min(fresnelPreset.centerOpacity * opacityScale, 1),
      edgeOpacity: Math.min(fresnelPreset.edgeOpacity * opacityScale, 1),
      power: fresnelPreset.power,
      edgeTintStrength: fresnelPreset.edgeTintStrength,
    });

    return material;
  }

  function makeReflectMaterial(sourceMaterial, mesh) {
    const source = sourceMaterial ?? {};
    const map = getMaterialColorTexture(source);
    const roughnessMap = getMaterialRoughnessTexture(source);
    const metalnessMap = getMaterialMetalnessTexture(source);
    const normalMap = getMaterialNormalTexture(source);
    const aoMap = getMaterialAoTexture(source);
    const hasTexture = Boolean(map);
    const tweak = findMaterialTweak(mesh, source);
    const reflectUvChannels = viewerConfig.materialPresets.reflectUvChannels;
    const colorChannel = getFallbackTextureChannel(mesh, reflectUvChannels.color);
    const roughnessChannel = getFallbackTextureChannel(mesh, reflectUvChannels.roughness);
    const metalnessChannel = getFallbackTextureChannel(mesh, reflectUvChannels.metalness);
    const aoChannel = getFallbackTextureChannel(mesh, reflectUvChannels.ao);
    const normalChannel = getFallbackTextureChannel(mesh, reflectUvChannels.normal);
    const reflectPreset = viewerConfig.materialPresets.reflectMaterial;

    applyTextureChannelOverride(map, colorChannel);
    applyTextureChannelOverride(roughnessMap, roughnessChannel);
    applyTextureChannelOverride(metalnessMap, metalnessChannel);
    applyTextureChannelOverride(aoMap, aoChannel);
    applyTextureChannelOverride(normalMap, normalChannel);

    const material = new THREE.MeshPhysicalMaterial({
      name: source.name || "ReflectMaterial",
      map,
      color: getMaterialTint(source, hasTexture),
      roughness: source.roughness ?? reflectPreset.defaultRoughness,
      roughnessMap,
      metalness: reflectionState.metalness,
      metalnessMap,
      normalMap,
      normalScale: source.normalScale?.clone?.() ?? new THREE.Vector2(1, 1),
      aoMap,
      envMapIntensity: reflectionState.envMapIntensity,
      transparent: Boolean(source.transparent),
      opacity: source.opacity ?? 1,
      alphaTest: source.alphaTest ?? 0,
      side: source.side ?? THREE.FrontSide,
      vertexColors: Boolean(source.vertexColors),
      emissive: source.emissive?.clone?.() ?? new THREE.Color(0x000000),
      emissiveMap: normalizeTexture(source.emissiveMap || null),
      emissiveIntensity: source.emissiveIntensity ?? 1,
      ior: reflectionState.ior,
      specularIntensity: reflectionState.specularIntensity,
      clearcoat: source.clearcoat ?? 0,
      clearcoatRoughness: source.clearcoatRoughness ?? 0,
      transmission: source.transmission ?? 0,
      thickness: source.thickness ?? 0,
    });

    material.envMap = reflectionEnvironment.getEnvironmentMap();

    stampViewerMaterialData(material, source, tweak);
    material.userData.viewerUvChannels = {
      color: map?.channel ?? colorChannel ?? null,
      roughness: roughnessMap?.channel ?? roughnessChannel ?? null,
      metalness: metalnessMap?.channel ?? metalnessChannel ?? null,
      ao: aoMap?.channel ?? aoChannel ?? null,
      normal: normalMap?.channel ?? normalChannel ?? null,
    };
    applyViewerMaterialPatches(material, { tweak });
    reflectionState.materials.add(material);

    return material;
  }

  function makeBackgroundMaterial(sourceMaterial) {
    const source = sourceMaterial ?? {};
    const map = getMaterialTexture(source);
    const hasTexture = Boolean(map);
    const tint = getMaterialTint(source, hasTexture);
    const backgroundUniforms = {
      viewerBackgroundMap: { value: map },
      viewerBackgroundTint: { value: tint },
      viewerBackgroundOpacity: { value: source.opacity ?? 1 },
      viewerBackgroundHue: { value: backgroundState.hueDegrees / 360 },
      viewerBackgroundSaturation: { value: backgroundState.saturation },
      viewerBackgroundValue: { value: backgroundState.value },
      viewerBackgroundTime: { value: backgroundState.motionTime },
      viewerBackgroundWarpStrength: { value: viewerConfig.materialPresets.background.warpStrength },
      viewerBackgroundWarpScale: { value: viewerConfig.materialPresets.background.warpScale },
      viewerBackgroundWarpSpeed: { value: viewerConfig.materialPresets.background.warpSpeed },
      viewerBackgroundShimmerStrength: { value: viewerConfig.materialPresets.background.shimmerStrength },
      viewerBackgroundShimmerSpeed: { value: viewerConfig.materialPresets.background.shimmerSpeed },
    };

    const material = new THREE.ShaderMaterial({
      name: source.name || "BackgroundMaterial",
      uniforms: backgroundUniforms,
      vertexShader: `
varying vec2 vViewerUv;

void main() {
  vViewerUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
      fragmentShader: `
uniform sampler2D viewerBackgroundMap;
uniform vec3 viewerBackgroundTint;
uniform float viewerBackgroundOpacity;
uniform float viewerBackgroundHue;
uniform float viewerBackgroundSaturation;
uniform float viewerBackgroundValue;
uniform float viewerBackgroundTime;
uniform float viewerBackgroundWarpStrength;
uniform float viewerBackgroundWarpScale;
uniform float viewerBackgroundWarpSpeed;
uniform float viewerBackgroundShimmerStrength;
uniform float viewerBackgroundShimmerSpeed;
varying vec2 vViewerUv;

vec3 viewerRgbToHsv(vec3 color) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(color.bg, K.wz), vec4(color.gb, K.xy), step(color.b, color.g));
  vec4 q = mix(vec4(p.xyw, color.r), vec4(color.r, p.yzx), step(p.x, color.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 viewerHsvToRgb(vec3 color) {
  vec3 rgb = clamp(abs(mod(color.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return color.z * mix(vec3(1.0), rgb, color.y);
}

void main() {
  float warpTime = viewerBackgroundTime * viewerBackgroundWarpSpeed;
  vec2 warpedUv = vViewerUv;
  vec2 warp = vec2(
    sin((warpedUv.y * 1.7 + warpedUv.x * 0.35) * viewerBackgroundWarpScale + warpTime * 1.13)
      + cos((warpedUv.y * 0.8 - warpedUv.x * 0.55) * viewerBackgroundWarpScale - warpTime * 0.87),
    cos((warpedUv.x * 1.35 - warpedUv.y * 0.25) * viewerBackgroundWarpScale - warpTime * 0.91)
      + sin((warpedUv.x * 0.65 + warpedUv.y * 0.45) * viewerBackgroundWarpScale + warpTime * 1.29)
  );
  warpedUv += warp * (viewerBackgroundWarpStrength * 0.5);
  warpedUv = clamp(warpedUv, vec2(0.001), vec2(0.999));

  vec4 sampled = texture2D(viewerBackgroundMap, warpedUv);
  vec3 color = sampled.rgb * viewerBackgroundTint;
  vec3 hsv = viewerRgbToHsv(color);
  hsv.x = fract(hsv.x + viewerBackgroundHue);
  hsv.y = clamp(hsv.y * viewerBackgroundSaturation, 0.0, 2.0);
  float shimmer = 1.0 + sin(
    (warpedUv.x + warpedUv.y * 1.4) * (viewerBackgroundWarpScale * 0.55)
    + viewerBackgroundTime * viewerBackgroundShimmerSpeed
  ) * viewerBackgroundShimmerStrength;
  hsv.z = clamp(hsv.z * viewerBackgroundValue * shimmer, 0.0, 2.0);
  gl_FragColor = vec4(viewerHsvToRgb(hsv), sampled.a * viewerBackgroundOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
      side: THREE.DoubleSide,
      transparent: Boolean(source.transparent) || (source.opacity ?? 1) < 1,
      depthWrite: false,
      fog: false,
    });

    material.toneMapped = true;
    material.userData.sourceMaterialName = source.name || "";
    material.userData.viewerTweakId = null;
    material.userData.viewerBackgroundUniforms = backgroundUniforms;
    material.uniformsNeedUpdate = true;
    backgroundState.materials.add(material);

    return material;
  }

  function makeUnlitAlphaMaterial(sourceMaterial) {
    const source = sourceMaterial ?? {};
    const hasSourceEmissiveMap = Boolean(source.emissiveMap?.isTexture);

    if (source.isMaterial && hasSourceEmissiveMap) {
      const material = source.clone();

      normalizeTexture(material.map || null);
      normalizeTexture(material.emissiveMap || null);
      normalizeDataTexture(material.alphaMap || null);

      if (material.color?.isColor) {
        material.color.set(0xffffff);
      }

      if (material.emissive?.isColor) {
        material.emissive.set(0xffffff);
      }

      if (typeof material.emissiveIntensity === "number") {
        material.emissiveIntensity = source.emissiveIntensity ?? 1;
      }

      if (typeof material.metalness === "number") {
        material.metalness = 0;
      }

      if (typeof material.roughness === "number") {
        material.roughness = 1;
      }

      if (typeof material.envMapIntensity === "number") {
        material.envMapIntensity = 0;
      }

      material.name = source.name || "UnlitAlphaMaterial";
      material.transparent = true;
      material.opacity = source.opacity ?? 1;
      material.alphaTest = source.alphaTest ?? 0;
      material.side = source.side ?? THREE.DoubleSide;
      material.depthWrite = false;
      material.fog = false;
      material.toneMapped = false;
      material.needsUpdate = true;
      material.userData.sourceMaterialName = source.name || "";
      material.userData.viewerTweakId = null;

      return material;
    }

    const map = getMaterialTexture(source);
    const alphaMap = getMaterialAlphaTexture(source);
    const hasTexture = Boolean(map);

    const material = new THREE.MeshBasicMaterial({
      name: source.name || "UnlitAlphaMaterial",
      map,
      alphaMap,
      color: getMaterialTint(source, hasTexture),
      transparent: true,
      opacity: source.opacity ?? 1,
      alphaTest: source.alphaTest ?? 0,
      side: source.side ?? THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexColors: Boolean(source.vertexColors),
      fog: false,
    });

    material.toneMapped = false;
    material.userData.sourceMaterialName = source.name || "";
    material.userData.viewerTweakId = null;

    return material;
  }

  function makeFxMaterial(sourceMaterial, mesh) {
    const source = sourceMaterial ?? {};
    const map = getMaterialTexture(source);
    const alphaMap = getMaterialAlphaTexture(source);
    const hasTexture = Boolean(map);
    const tweak = findMaterialTweak(mesh, source);
    const colorChannel = getFallbackTextureChannel(
      mesh,
      viewerConfig.materialPresets.fxUvChannels.color,
    );
    const alphaChannel = getFallbackTextureChannel(
      mesh,
      viewerConfig.materialPresets.fxUvChannels.alpha,
    );

    applyTextureChannelOverride(map, colorChannel);
    applyTextureChannelOverride(alphaMap, alphaChannel);
    const material = new THREE.MeshBasicMaterial({
      name: source.name || "FxMaterial",
      map,
      alphaMap,
      color: getMaterialTint(source, hasTexture),
      transparent: true,
      opacity: source.opacity ?? 1,
      alphaTest: source.alphaTest || viewerConfig.materialPresets.fxAlphaCutoff,
      side: source.side ?? THREE.DoubleSide,
      depthWrite: false,
      blending: looksLikeAdditiveFx(mesh, source) ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexColors: Boolean(source.vertexColors),
    });

    stampViewerMaterialData(material, source, tweak);
    applyViewerMaterialPatches(material, { tweak });

    return material;
  }

  function makeViewerMaterial(sourceMaterial, mesh, materialMode) {
    switch (materialMode) {
      case "background":
        return makeBackgroundMaterial(sourceMaterial);
      case "unlitAlpha":
        return makeUnlitAlphaMaterial(sourceMaterial);
      case "alphaCutout":
        return makeAlphaCutoutMaterial(sourceMaterial, mesh);
      case "glass":
        return makeGlassMaterial(sourceMaterial, mesh);
      case "reflect":
        return makeReflectMaterial(sourceMaterial, mesh);
      case "fx":
        return makeFxMaterial(sourceMaterial, mesh);
      case "baked":
      default:
        return makeBakedMaterial(sourceMaterial, mesh);
    }
  }

  function convertMeshForLayer(mesh, materialMode) {
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((material) => makeViewerMaterial(material, mesh, materialMode));
    } else {
      mesh.material = makeViewerMaterial(mesh.material, mesh, materialMode);
    }

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
    if (entry.layer.id !== "base") {
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
  };
}

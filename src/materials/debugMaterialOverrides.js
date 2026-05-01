export function createDebugMaterialOverrides({
  getMaterialCompileHookState,
  setMaterialCompileHook,
}) {
  const DEBUG_COLOR_DEFAULTS = Object.freeze({
    hue: 0,
    saturation: 1,
    value: 1,
    gamma: 1,
  });

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

  function canApplyDebugColorCorrection(material) {
    return Boolean(material?.isMaterial) && !material?.isShaderMaterial;
  }

  function syncDebugColorUniforms(material) {
    const uniforms = material.userData.viewerDebugColorUniforms;
    if (!uniforms) {
      return;
    }

    const override = normalizeDebugColorOverride(material.userData.viewerDebugColorOverride);
    uniforms.viewerDebugHue.value = override.hue / 360;
    uniforms.viewerDebugSaturation.value = override.saturation;
    uniforms.viewerDebugValue.value = override.value;
    uniforms.viewerDebugGamma.value = override.gamma;
  }

  function ensureDebugColorHook(material) {
    if (!canApplyDebugColorCorrection(material)) {
      return false;
    }

    const hookState = getMaterialCompileHookState(material);
    if (hookState.hooks.has("viewerDebugColorCorrection")) {
      return true;
    }

    setMaterialCompileHook(material, "viewerDebugColorCorrection", (shader) => {
      const override = normalizeDebugColorOverride(material.userData.viewerDebugColorOverride);
      const uniforms = material.userData.viewerDebugColorUniforms ?? {
        viewerDebugHue: { value: override.hue / 360 },
        viewerDebugSaturation: { value: override.saturation },
        viewerDebugValue: { value: override.value },
        viewerDebugGamma: { value: override.gamma },
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
  hsv.y = clamp(hsv.y * viewerDebugSaturation, 0.0, 4.0);
  hsv.z = clamp(hsv.z * viewerDebugValue, 0.0, 8.0);
  vec3 corrected = viewerDebugHsvToRgb(hsv);
  return pow(max(corrected, vec3(0.0)), vec3(1.0 / max(viewerDebugGamma, 0.0001)));
}`,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <colorspace_fragment>",
        `gl_FragColor.rgb = viewerDebugApplyColorCorrection(gl_FragColor.rgb);
#include <colorspace_fragment>`,
      );
    });

    return true;
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

    material.userData.viewerDebugColorOverride = normalizedOverride;
    ensureDebugColorHook(material);
    syncDebugColorUniforms(material);
    return true;
  }

  return {
    applyDebugColorCorrection,
    canApplyDebugColorCorrection,
    clearDebugColorCorrection,
  };
}

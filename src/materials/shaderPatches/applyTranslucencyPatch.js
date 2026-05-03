export function createTranslucencyPatchApplier({ setMaterialCompileHook }) {
  return function applyTranslucencyPatch(material, {
    sunDirection,
    strength,
    hueDegrees,
    saturationBoost,
    brightnessBoost,
  }) {
    if (!sunDirection || strength <= 0) {
      return;
    }

    setMaterialCompileHook(material, "viewerTranslucencyPatch", (shader) => {
      shader.uniforms.viewerSunDirection = { value: sunDirection };
      shader.uniforms.viewerTranslucencyStrength = { value: strength };
      shader.uniforms.viewerHueDegrees = { value: hueDegrees };
      shader.uniforms.viewerSaturationBoost = { value: saturationBoost };
      shader.uniforms.viewerBrightnessBoost = { value: brightnessBoost };

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
uniform vec3 viewerSunDirection;
uniform float viewerTranslucencyStrength;
uniform float viewerHueDegrees;
uniform float viewerSaturationBoost;
uniform float viewerBrightnessBoost;

vec3 viewerTranslucencyShift(vec3 color, float hueDeg, float satBoost, float brightBoost) {
  vec3 result = color * (1.0 + brightBoost);
  float luma = dot(result, vec3(0.2126, 0.7152, 0.0722));
  result = mix(vec3(luma), result, 1.0 + satBoost);
  float angle = hueDeg * 3.14159265 / 180.0;
  float cosA = cos(angle);
  float sinA = sin(angle);
  mat3 hueRotation = mat3(
    0.213 + cosA * 0.787 - sinA * 0.213,
    0.213 - cosA * 0.213 + sinA * 0.143,
    0.213 - cosA * 0.213 - sinA * 0.787,
    0.715 - cosA * 0.715 - sinA * 0.715,
    0.715 + cosA * 0.285 + sinA * 0.140,
    0.715 - cosA * 0.715 + sinA * 0.715,
    0.072 - cosA * 0.072 + sinA * 0.928,
    0.072 - cosA * 0.072 - sinA * 0.283,
    0.072 + cosA * 0.928 + sinA * 0.072
  );
  return hueRotation * result;
}`,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <specularmap_fragment>",
        `#include <specularmap_fragment>
{
  vec3 viewerTranslNormal = normalize( vNormal );
  float backlit = max(0.0, dot(viewerTranslNormal, -viewerSunDirection));
  if (backlit > 0.0) {
    float factor = viewerTranslucencyStrength * backlit;
    diffuseColor.rgb = mix(diffuseColor.rgb, viewerTranslucencyShift(diffuseColor.rgb, viewerHueDegrees, viewerSaturationBoost, viewerBrightnessBoost), factor);
  }
}`,
      );
    });
  };
}

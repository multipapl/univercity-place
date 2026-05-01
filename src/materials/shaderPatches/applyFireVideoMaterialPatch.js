export function createFireVideoMaterialPatchApplier({
  viewerConfig,
  fireState,
  setMaterialCompileHook,
}) {
  return function applyFireVideoMaterialPatch(material) {
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
  };
}

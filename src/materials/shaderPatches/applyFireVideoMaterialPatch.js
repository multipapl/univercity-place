import { buildHsvConversionGlsl } from "../shaderChunks/buildHsvConversionGlsl.js";

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
${buildHsvConversionGlsl("viewerFire")}`,
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

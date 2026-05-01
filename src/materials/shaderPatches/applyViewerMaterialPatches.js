import * as THREE from "three";

function getUvAttributeName(channel) {
  return channel === 0 ? "uv" : `uv${channel}`;
}

export function createViewerMaterialPatchApplier({ setMaterialCompileHook }) {
  return function applyViewerMaterialPatches(
    material,
    { tweak = null, alphaFromMapChannel = null } = {},
  ) {
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
  };
}

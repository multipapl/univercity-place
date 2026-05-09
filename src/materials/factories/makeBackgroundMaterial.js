import { DoubleSide, ShaderMaterial } from "three";
import { buildHsvConversionGlsl } from "../shaderChunks/buildHsvConversionGlsl.js";

export function makeBackgroundMaterial({
  viewerConfig,
  backgroundState,
  sourceMaterial,
  getMaterialTexture,
  getMaterialAlphaTexture,
  getMaterialTint,
}) {
  const source = sourceMaterial ?? {};
  const map = getMaterialTexture(source);
  const alphaMap = getMaterialAlphaTexture(source);
  const hasTexture = Boolean(map);
  const tint = getMaterialTint(source, hasTexture);
  const alphaCutoff = Number.isFinite(source.alphaTest) && source.alphaTest > 0
    ? source.alphaTest
    : (viewerConfig.materialPresets.alphaCutoff ?? 0.5);
  const usesAlphaCutout = Boolean(alphaMap) || hasTexture;
  const hasExplicitAlpha = Boolean(alphaMap)
    || (source.opacity ?? 1) < 1
    || (source.alphaTest ?? 0) > 0;
  const backgroundUniforms = {
    viewerBackgroundMap: { value: map },
    viewerBackgroundAlphaMap: { value: alphaMap },
    viewerBackgroundHasAlphaMap: { value: Boolean(alphaMap) ? 1 : 0 },
    viewerBackgroundAlphaCutoff: { value: alphaCutoff },
    viewerDebugHue: { value: 0 },
    viewerDebugSaturation: { value: 1 },
    viewerDebugValue: { value: 1 },
    viewerDebugGamma: { value: 1 },
    viewerBackgroundTint: { value: tint },
    viewerBackgroundOpacity: { value: source.opacity ?? 1 },
    viewerBackgroundHue: { value: 0 },
    viewerBackgroundSaturation: { value: 1 },
    viewerBackgroundValue: { value: 1 },
    viewerBackgroundTime: { value: backgroundState.motionTime },
    viewerBackgroundWarpStrength: { value: viewerConfig.materialPresets.background.warpStrength },
    viewerBackgroundWarpScale: { value: viewerConfig.materialPresets.background.warpScale },
    viewerBackgroundWarpSpeed: { value: viewerConfig.materialPresets.background.warpSpeed },
    viewerBackgroundShimmerStrength: { value: viewerConfig.materialPresets.background.shimmerStrength },
    viewerBackgroundShimmerSpeed: { value: viewerConfig.materialPresets.background.shimmerSpeed },
  };

  const material = new ShaderMaterial({
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
uniform sampler2D viewerBackgroundAlphaMap;
uniform float viewerBackgroundHasAlphaMap;
uniform float viewerBackgroundAlphaCutoff;
uniform float viewerDebugHue;
uniform float viewerDebugSaturation;
uniform float viewerDebugValue;
uniform float viewerDebugGamma;
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
${buildHsvConversionGlsl("viewer")}

vec3 viewerDebugApplyColorCorrection(vec3 color) {
  vec3 hsv = viewerRgbToHsv(max(color, vec3(0.0)));
  hsv.x = fract(hsv.x + viewerDebugHue);
  hsv.y = clamp(hsv.y * viewerDebugSaturation, 0.0, 4.0);
  hsv.z = clamp(hsv.z * viewerDebugValue, 0.0, 8.0);
  vec3 corrected = viewerHsvToRgb(hsv);
  return pow(max(corrected, vec3(0.0)), vec3(1.0 / max(viewerDebugGamma, 0.0001)));
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
  float sampledAlpha = sampled.a;
  if (viewerBackgroundHasAlphaMap > 0.5) {
    sampledAlpha = texture2D(viewerBackgroundAlphaMap, warpedUv).g;
  }
  if (sampledAlpha <= viewerBackgroundAlphaCutoff) {
    discard;
  }
  vec3 color = sampled.rgb * viewerBackgroundTint;
  vec3 hsv = viewerRgbToHsv(color);
  hsv.x = fract(hsv.x + viewerBackgroundHue);
  hsv.y = clamp(hsv.y * viewerBackgroundSaturation, 0.0, 2.0);
  float shimmer = 1.0 + sin(
    (warpedUv.x + warpedUv.y * 1.4) * (viewerBackgroundWarpScale * 0.55)
    + viewerBackgroundTime * viewerBackgroundShimmerSpeed
  ) * viewerBackgroundShimmerStrength;
  hsv.z = clamp(hsv.z * viewerBackgroundValue * shimmer, 0.0, 2.0);
  gl_FragColor = vec4(viewerDebugApplyColorCorrection(viewerHsvToRgb(hsv)), sampledAlpha * viewerBackgroundOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
    side: DoubleSide,
    transparent: hasExplicitAlpha && !usesAlphaCutout,
    depthWrite: false,
    fog: false,
  });

  material.alphaTest = usesAlphaCutout ? alphaCutoff : 0;
  material.toneMapped = true;
  material.userData.sourceMaterialName = source.name || "";
  material.userData.viewerTweakId = null;
  material.userData.viewerBackgroundUniforms = backgroundUniforms;
  material.userData.viewerDebugColorUniforms = {
    viewerDebugHue: backgroundUniforms.viewerDebugHue,
    viewerDebugSaturation: backgroundUniforms.viewerDebugSaturation,
    viewerDebugValue: backgroundUniforms.viewerDebugValue,
    viewerDebugGamma: backgroundUniforms.viewerDebugGamma,
  };
  material.uniformsNeedUpdate = true;
  backgroundState.materials.add(material);

  return material;
}

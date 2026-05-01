import * as THREE from "three";

export function makeBackgroundMaterial({
  viewerConfig,
  backgroundState,
  sourceMaterial,
  getMaterialTexture,
  getMaterialTint,
}) {
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

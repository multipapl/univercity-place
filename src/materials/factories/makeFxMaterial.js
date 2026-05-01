import * as THREE from "three";

export function makeFxMaterial({
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
}) {
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

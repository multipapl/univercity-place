import { DoubleSide, MeshBasicMaterial } from "three";

export function makeAlphaCutoutMaterial({
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
  applyTranslucencyPatch = null,
  translucencyConfig = null,
  translucencySunDirection = null,
}) {
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

  const material = new MeshBasicMaterial({
    name: source.name || "AlphaCutoutMaterial",
    map,
    alphaMap,
    color: getMaterialTint(source, hasTexture),
    transparent: false,
    opacity: source.opacity ?? 1,
    alphaTest: source.alphaTest || viewerConfig.materialPresets.alphaCutoff,
    side: DoubleSide,
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

  if (applyTranslucencyPatch && translucencyConfig) {
    applyTranslucencyPatch(material, {
      sunDirection: translucencySunDirection,
      strength: translucencyConfig.strength,
      hueDegrees: translucencyConfig.hueDegrees,
      saturationBoost: translucencyConfig.saturationBoost,
      brightnessBoost: translucencyConfig.brightnessBoost,
    });
  }

  return material;
}

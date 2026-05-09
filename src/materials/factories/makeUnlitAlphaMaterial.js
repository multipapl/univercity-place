import { DoubleSide, MeshBasicMaterial, NormalBlending } from "three";

export function makeUnlitAlphaMaterial({
  sourceMaterial,
  getMaterialTexture,
  getMaterialAlphaTexture,
  getMaterialTint,
  normalizeTexture,
  normalizeDataTexture,
}) {
  const source = sourceMaterial ?? {};
  const hasSourceEmissiveMap = Boolean(source.emissiveMap?.isTexture);
  const hasExplicitAlpha = Boolean(source.alphaMap?.isTexture)
    || (source.opacity ?? 1) < 1
    || (source.alphaTest ?? 0) > 0;

  if (source.isMaterial && hasSourceEmissiveMap) {
    const map = normalizeTexture(source.map || source.emissiveMap || null);
    const alphaMap = normalizeDataTexture(source.alphaMap || null);
    const usesAlphaBlending = Boolean(alphaMap) || hasExplicitAlpha;

    const material = new MeshBasicMaterial({
      name: source.name || "UnlitAlphaMaterial",
      map,
      alphaMap,
      color: 0xffffff,
      transparent: usesAlphaBlending,
      opacity: source.opacity ?? 1,
      alphaTest: source.alphaTest ?? 0,
      side: source.side ?? DoubleSide,
      depthWrite: false,
      blending: NormalBlending,
      vertexColors: Boolean(source.vertexColors),
      fog: false,
    });

    material.toneMapped = false;
    material.needsUpdate = true;
    material.userData.sourceMaterialName = source.name || "";
    material.userData.viewerTweakId = null;

    return material;
  }

  const map = getMaterialTexture(source);
  const alphaMap = getMaterialAlphaTexture(source);
  const hasTexture = Boolean(map);
  const usesAlphaBlending = Boolean(alphaMap) || hasExplicitAlpha;

  const material = new MeshBasicMaterial({
    name: source.name || "UnlitAlphaMaterial",
    map,
    alphaMap,
    color: getMaterialTint(source, hasTexture),
    transparent: usesAlphaBlending,
    opacity: source.opacity ?? 1,
    alphaTest: source.alphaTest ?? 0,
    side: source.side ?? DoubleSide,
    depthWrite: false,
    blending: NormalBlending,
    vertexColors: Boolean(source.vertexColors),
    fog: false,
  });

  material.toneMapped = false;
  material.userData.sourceMaterialName = source.name || "";
  material.userData.viewerTweakId = null;

  return material;
}

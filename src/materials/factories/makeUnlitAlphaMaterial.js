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

  if (source.isMaterial && hasSourceEmissiveMap) {
    const material = source.clone();

    normalizeTexture(material.map || null);
    normalizeTexture(material.emissiveMap || null);
    normalizeDataTexture(material.alphaMap || null);

    if (material.color?.isColor) {
      material.color.set(0xffffff);
    }

    if (material.emissive?.isColor) {
      material.emissive.set(0xffffff);
    }

    if (typeof material.emissiveIntensity === "number") {
      material.emissiveIntensity = source.emissiveIntensity ?? 1;
    }

    if (typeof material.metalness === "number") {
      material.metalness = 0;
    }

    if (typeof material.roughness === "number") {
      material.roughness = 1;
    }

    if (typeof material.envMapIntensity === "number") {
      material.envMapIntensity = 0;
    }

    material.name = source.name || "UnlitAlphaMaterial";
    material.transparent = true;
    material.opacity = source.opacity ?? 1;
    material.alphaTest = source.alphaTest ?? 0;
    material.side = source.side ?? DoubleSide;
    material.depthWrite = false;
    material.fog = false;
    material.toneMapped = false;
    material.needsUpdate = true;
    material.userData.sourceMaterialName = source.name || "";
    material.userData.viewerTweakId = null;

    return material;
  }

  const map = getMaterialTexture(source);
  const alphaMap = getMaterialAlphaTexture(source);
  const hasTexture = Boolean(map);

  const material = new MeshBasicMaterial({
    name: source.name || "UnlitAlphaMaterial",
    map,
    alphaMap,
    color: getMaterialTint(source, hasTexture),
    transparent: true,
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

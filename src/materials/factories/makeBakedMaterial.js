import * as THREE from "three";

export function makeBakedMaterial({
  sourceMaterial,
  mesh,
  findMaterialTweak,
  getMaterialTexture,
  getMaterialTint,
  stampViewerMaterialData,
  applyViewerMaterialPatches,
  tuneBakedTexture,
}) {
  const source = sourceMaterial ?? {};
  const map = getMaterialTexture(source);
  const hasTexture = Boolean(map);
  const hasEmissiveMap = Boolean(source.emissiveMap);
  const tintColor = getMaterialTint(source, hasTexture);
  const tweak = findMaterialTweak(mesh, source);

  tuneBakedTexture(map);

  const material = new THREE.MeshBasicMaterial({
    name: source.name || "BakedMaterial",
    map,
    color: tintColor,
    transparent: Boolean(source.transparent),
    opacity: source.opacity ?? 1,
    alphaTest: source.alphaTest ?? 0,
    side: source.side ?? (hasEmissiveMap ? THREE.DoubleSide : THREE.FrontSide),
    vertexColors: Boolean(source.vertexColors),
  });

  stampViewerMaterialData(material, source, tweak);
  applyViewerMaterialPatches(material, { tweak });

  return material;
}

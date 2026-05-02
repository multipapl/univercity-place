import { DoubleSide, MeshBasicMaterial } from "three";

export function makeGlassMaterial({
  viewerConfig,
  sourceMaterial,
  mesh,
  findMaterialTweak,
  getMaterialTexture,
  getMaterialTint,
  stampViewerMaterialData,
  applyGlassMaterialPatch,
}) {
  const source = sourceMaterial ?? {};
  const map = getMaterialTexture(source);
  const hasTexture = Boolean(map);
  const tweak = findMaterialTweak(mesh, source);
  const opacityScale = source.transparent
    ? (source.opacity ?? 1)
    : 1;
  const fresnelPreset = viewerConfig.materialPresets.glassFresnel;
  const material = new MeshBasicMaterial({
    name: source.name || "GlassMaterial",
    map,
    color: getMaterialTint(source, hasTexture),
    transparent: true,
    opacity: 1,
    alphaTest: source.alphaTest || viewerConfig.materialPresets.glassAlphaCutoff,
    side: DoubleSide,
    depthWrite: false,
    vertexColors: Boolean(source.vertexColors),
  });

  stampViewerMaterialData(material, source, tweak);
  applyGlassMaterialPatch(material, {
    centerOpacity: Math.min(fresnelPreset.centerOpacity * opacityScale, 1),
    edgeOpacity: Math.min(fresnelPreset.edgeOpacity * opacityScale, 1),
    power: fresnelPreset.power,
    edgeTintStrength: fresnelPreset.edgeTintStrength,
  });

  return material;
}

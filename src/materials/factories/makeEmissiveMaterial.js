import { MeshBasicMaterial } from "three";

export function makeEmissiveMaterial({
  viewerConfig,
  sourceMaterial,
  mesh,
  findMaterialTweak,
  stampViewerMaterialData,
  applyViewerMaterialPatches,
}) {
  const source = sourceMaterial ?? {};
  const tweak = findMaterialTweak(mesh, source);
  const emissiveColor = source.emissive?.clone?.() ?? source.color?.clone?.();
  const intensity = (source.emissiveIntensity ?? 1)
    * viewerConfig.materialPresets.emissiveMaterial.intensityMultiplier;

  const material = new MeshBasicMaterial({
    name: source.name || "EmissiveMaterial",
    color: emissiveColor,
    transparent: false,
    opacity: 1,
    side: source.side,
    vertexColors: Boolean(source.vertexColors),
  });

  material.color.multiplyScalar(intensity);

  stampViewerMaterialData(material, source, tweak);
  applyViewerMaterialPatches(material, { tweak });
  return material;
}

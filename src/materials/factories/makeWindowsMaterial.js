import { DoubleSide, MeshPhysicalMaterial } from "three";

export function makeWindowsMaterial({
  viewerConfig,
  reflectionState,
  reflectionEnvironment,
  sourceMaterial,
  mesh,
  findMaterialTweak,
  stampViewerMaterialData,
  applyViewerMaterialPatches,
}) {
  const source = sourceMaterial ?? {};
  const tweak = findMaterialTweak(mesh, source);
  const windowsPreset = viewerConfig.materialPresets.windowsMaterial;

  const material = new MeshPhysicalMaterial({
    name: source.name || "WindowsMaterial",
    color: 0xffffff,
    side: DoubleSide,
    transparent: true,
    opacity: windowsPreset.opacity ?? 0.08,
    depthWrite: false,
    roughness: windowsPreset.roughness,
    ior: windowsPreset.ior,
    transmission: windowsPreset.transmission,
  });

  stampViewerMaterialData(material, source, tweak);
  applyViewerMaterialPatches(material, { tweak });

  return material;
}

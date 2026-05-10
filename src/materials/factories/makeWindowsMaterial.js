import { DoubleSide, MeshPhysicalMaterial } from "three";
import { makeSafeGlassLikeMaterial } from "./makeSafeGlassLikeMaterial.js";

export function makeWindowsMaterial({
  viewerConfig,
  reflectionState,
  reflectionEnvironment,
  sourceMaterial,
  mesh,
  findMaterialTweak,
  getMaterialTexture,
  getMaterialTint,
  stampViewerMaterialData,
  applyViewerMaterialPatches,
  materialSafetyProfile = {},
}) {
  const source = sourceMaterial ?? {};
  const tweak = findMaterialTweak(mesh, source);
  const windowsPreset = viewerConfig.materialPresets.windowsMaterial;

  if (materialSafetyProfile.useCheapGlassMaterial) {
    return makeSafeGlassLikeMaterial({
      name: "SafeWindowsMaterial",
      sourceMaterial,
      mesh,
      reflectionEnvironment,
      tint: getMaterialTint(source, Boolean(source.map)),
      map: getMaterialTexture(source),
      opacity: 0.22,
      stampViewerMaterialData,
      applyViewerMaterialPatches,
      tweak,
    });
  }

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

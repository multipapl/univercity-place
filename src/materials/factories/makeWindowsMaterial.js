import { DoubleSide, Euler, MeshPhysicalMaterial, Vector3 } from "three";
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
    color: source.color?.clone?.() ?? 0xffffff,
    side: DoubleSide,
    roughness: windowsPreset.roughness,
    ior: windowsPreset.ior,
    transmission: windowsPreset.transmission,
    envMapIntensity: windowsPreset.envMapIntensity,
  });

  const worldCenter = new Vector3();
  if (mesh.geometry) {
    mesh.geometry.computeBoundingBox();
    mesh.geometry.boundingBox.getCenter(worldCenter);
    mesh.localToWorld(worldCenter);
  }
  material.envMap = reflectionEnvironment.getClosestEnvMap(worldCenter);
  material.envMapRotation = new Euler(0, reflectionState.envMapRotationY, 0);

  stampViewerMaterialData(material, source, tweak);
  applyViewerMaterialPatches(material, { tweak });
  reflectionState.probeMaterials.add(material);

  return material;
}

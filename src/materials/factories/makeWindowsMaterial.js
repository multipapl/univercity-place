import { DoubleSide, MeshPhysicalMaterial, Vector3 } from "three";

export function makeWindowsMaterial({
  viewerConfig,
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
    color: source.color?.clone?.() ?? 0xffffff,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    vertexColors: Boolean(source.vertexColors),
    roughness: source.roughness ?? windowsPreset.roughness,
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

  stampViewerMaterialData(material, source, tweak);
  applyViewerMaterialPatches(material, { tweak });

  return material;
}

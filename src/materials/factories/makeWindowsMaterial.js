import { DoubleSide, MeshPhysicalMaterial, Vector3 } from "three";

export function makeWindowsMaterial({
  viewerConfig,
  reflectionEnvironment,
  sourceMaterial,
  mesh,
  findMaterialTweak,
  stampViewerMaterialData,
  applyViewerMaterialPatches,
  applyBoxProjectionPatch,
}) {
  const source = sourceMaterial ?? {};
  const tweak = findMaterialTweak(mesh, source);
  const windowsPreset = viewerConfig.materialPresets.windowsMaterial;

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
  const probeData = reflectionEnvironment.getClosestProbeData(worldCenter);
  material.envMap = probeData?.envMap ?? reflectionEnvironment.getClosestEnvMap(worldCenter);

  stampViewerMaterialData(material, source, tweak);
  applyViewerMaterialPatches(material, { tweak });
  if (probeData) {
    applyBoxProjectionPatch(material, probeData);
  }

  return material;
}

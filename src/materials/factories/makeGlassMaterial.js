import { DoubleSide, MeshPhysicalMaterial, Vector2, Vector3 } from "three";

export function makeGlassMaterial({
  viewerConfig,
  reflectionEnvironment,
  sourceMaterial,
  mesh,
  findMaterialTweak,
  getMaterialTexture,
  getMaterialNormalTexture,
  getMaterialRoughnessTexture,
  getMaterialTint,
  getFallbackTextureChannel,
  applyTextureChannelOverride,
  stampViewerMaterialData,
  applyViewerMaterialPatches,
}) {
  const source = sourceMaterial ?? {};
  const map = getMaterialTexture(source);
  const normalMap = getMaterialNormalTexture(source);
  const roughnessMap = getMaterialRoughnessTexture(source);
  const hasTexture = Boolean(map);
  const tweak = findMaterialTweak(mesh, source);
  const glassUvChannels = viewerConfig.materialPresets.glassUvChannels;
  const glassPreset = viewerConfig.materialPresets.glassMaterial;

  const colorChannel = getFallbackTextureChannel(mesh, glassUvChannels.color);
  const normalChannel = getFallbackTextureChannel(mesh, glassUvChannels.normal);
  const roughnessChannel = getFallbackTextureChannel(mesh, glassUvChannels.roughness);

  applyTextureChannelOverride(map, colorChannel);
  applyTextureChannelOverride(normalMap, normalChannel);
  applyTextureChannelOverride(roughnessMap, roughnessChannel);

  const material = new MeshPhysicalMaterial({
    name: source.name || "GlassMaterial",
    map,
    color: getMaterialTint(source, hasTexture),
    normalMap,
    normalScale: source.normalScale?.clone?.() ?? new Vector2(1, 1),
    roughness: source.roughness ?? glassPreset.defaultRoughness,
    roughnessMap,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    vertexColors: Boolean(source.vertexColors),
    ior: glassPreset.ior,
    transmission: glassPreset.transmission,
    thickness: glassPreset.thickness,
    envMapIntensity: glassPreset.envMapIntensity,
  });

  const worldCenter = new Vector3();
  if (mesh.geometry) {
    mesh.geometry.computeBoundingBox();
    mesh.geometry.boundingBox.getCenter(worldCenter);
    mesh.localToWorld(worldCenter);
  }
  material.envMap = reflectionEnvironment.getClosestEnvMap(worldCenter);

  stampViewerMaterialData(material, source, tweak);
  material.userData.viewerUvChannels = {
    color: map?.channel ?? colorChannel ?? null,
    roughness: roughnessMap?.channel ?? roughnessChannel ?? null,
    normal: normalMap?.channel ?? normalChannel ?? null,
  };
  applyViewerMaterialPatches(material, { tweak });

  return material;
}

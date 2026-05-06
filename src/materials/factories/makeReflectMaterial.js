import { Color, Euler, FrontSide, MeshPhysicalMaterial, Vector2, Vector3 } from "three";

export function makeReflectMaterial({
  viewerConfig,
  reflectionState,
  reflectionEnvironment,
  sourceMaterial,
  mesh,
  findMaterialTweak,
  getMaterialColorTexture,
  getMaterialRoughnessTexture,
  getMaterialMetalnessTexture,
  getMaterialNormalTexture,
  getMaterialAoTexture,
  getMaterialTint,
  getFallbackTextureChannel,
  applyTextureChannelOverride,
  stampViewerMaterialData,
  applyViewerMaterialPatches,
  applyBoxProjectionPatch,
  normalizeTexture,
}) {
  const source = sourceMaterial ?? {};
  const map = getMaterialColorTexture(source);
  const roughnessMap = getMaterialRoughnessTexture(source);
  const metalnessMap = getMaterialMetalnessTexture(source);
  const normalMap = getMaterialNormalTexture(source);
  const aoMap = getMaterialAoTexture(source);
  const hasTexture = Boolean(map);
  const tweak = findMaterialTweak(mesh, source);
  const reflectUvChannels = viewerConfig.materialPresets.reflectUvChannels;
  const colorChannel = getFallbackTextureChannel(mesh, reflectUvChannels.color);
  const roughnessChannel = getFallbackTextureChannel(mesh, reflectUvChannels.roughness);
  const metalnessChannel = getFallbackTextureChannel(mesh, reflectUvChannels.metalness);
  const aoChannel = getFallbackTextureChannel(mesh, reflectUvChannels.ao);
  const normalChannel = getFallbackTextureChannel(mesh, reflectUvChannels.normal);
  const reflectPreset = viewerConfig.materialPresets.reflectMaterial;

  applyTextureChannelOverride(map, colorChannel);
  applyTextureChannelOverride(roughnessMap, roughnessChannel);
  applyTextureChannelOverride(metalnessMap, metalnessChannel);
  applyTextureChannelOverride(aoMap, aoChannel);
  applyTextureChannelOverride(normalMap, normalChannel);

  const material = new MeshPhysicalMaterial({
    name: source.name || "ReflectMaterial",
    map,
    color: getMaterialTint(source, hasTexture),
    roughness: reflectPreset.defaultRoughness,
    roughnessMap: null,
    metalness: reflectPreset.defaultMetalness,
    metalnessMap: null,
    normalMap,
    normalScale: source.normalScale?.clone?.() ?? new Vector2(1, 1),
    aoMap,
    envMapIntensity: reflectionState.envMapIntensity,
    transparent: Boolean(source.transparent),
    opacity: source.opacity ?? 1,
    alphaTest: source.alphaTest ?? 0,
    side: source.side ?? FrontSide,
    vertexColors: Boolean(source.vertexColors),
    emissive: source.emissive?.clone?.() ?? new Color(0x000000),
    emissiveMap: normalizeTexture(source.emissiveMap || null),
    emissiveIntensity: source.emissiveIntensity ?? 1,
    ior: reflectionState.ior,
    specularIntensity: reflectionState.specularIntensity,
    clearcoat: source.clearcoat ?? 0,
    clearcoatRoughness: source.clearcoatRoughness ?? 0,
    transmission: source.transmission ?? 0,
    thickness: source.thickness ?? 0,
  });

  const worldCenter = new Vector3();
  if (mesh.geometry) {
    mesh.geometry.computeBoundingBox();
    mesh.geometry.boundingBox.getCenter(worldCenter);
    mesh.localToWorld(worldCenter);
  }
  const probeData = reflectionEnvironment.getClosestProbeData(worldCenter);
  material.envMap = probeData?.envMap ?? reflectionEnvironment.getClosestEnvMap(worldCenter);
  material.envMapRotation = new Euler(0, reflectionState.envMapRotationY, 0);

  stampViewerMaterialData(material, source, tweak);
  material.userData.meshWorldCenter = worldCenter.clone();
  material.userData.viewerUvChannels = {
    color: map?.channel ?? colorChannel ?? null,
    roughness: roughnessMap?.channel ?? roughnessChannel ?? null,
    metalness: metalnessMap?.channel ?? metalnessChannel ?? null,
    ao: aoMap?.channel ?? aoChannel ?? null,
    normal: normalMap?.channel ?? normalChannel ?? null,
  };
  applyViewerMaterialPatches(material, { tweak });
  if (probeData) {
    applyBoxProjectionPatch(material, probeData);
  }
  reflectionState.materials.add(material);

  return material;
}

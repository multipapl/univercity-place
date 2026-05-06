import { CanvasTexture, DoubleSide, MeshPhysicalMaterial, RepeatWrapping, Vector2, Vector3 } from "three";

// Procedural bump for glass test — remove when real textures are ready
let _sharedBumpTexture = null;
function getProceduralGlassBump() {
  if (_sharedBumpTexture) return _sharedBumpTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(2, 2);
  _sharedBumpTexture = tex;
  return tex;
}

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
  applyBoxProjectionPatch,
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
    roughness: glassPreset.defaultRoughness,
    roughnessMap,
    side: DoubleSide,
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
  const probeData = reflectionEnvironment.getClosestProbeData(worldCenter);
  material.envMap = probeData?.envMap ?? reflectionEnvironment.getClosestEnvMap(worldCenter);
  material.bumpMap = normalMap ? null : getProceduralGlassBump();
  material.bumpScale = 0.5;

  stampViewerMaterialData(material, source, tweak);
  material.userData.meshWorldCenter = worldCenter.clone();
  material.userData.viewerUvChannels = {
    color: map?.channel ?? colorChannel ?? null,
    roughness: roughnessMap?.channel ?? roughnessChannel ?? null,
    normal: normalMap?.channel ?? normalChannel ?? null,
  };
  applyViewerMaterialPatches(material, { tweak });
  if (probeData) {
    applyBoxProjectionPatch(material, probeData);
  }

  return material;
}

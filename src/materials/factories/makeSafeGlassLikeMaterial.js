import { Color, DoubleSide, MeshBasicMaterial, Vector3 } from "three";

export function makeSafeGlassLikeMaterial({
  name,
  sourceMaterial,
  mesh,
  reflectionEnvironment,
  tint = null,
  map = null,
  opacity = 0.18,
  stampViewerMaterialData,
  applyViewerMaterialPatches,
  tweak,
  viewerUvChannels = null,
}) {
  const source = sourceMaterial ?? {};
  const hasExplicitOpacity = typeof source.opacity === "number" && source.opacity < 0.999;
  const worldCenter = new Vector3();
  if (mesh.geometry) {
    mesh.geometry.computeBoundingBox();
    mesh.geometry.boundingBox.getCenter(worldCenter);
    mesh.localToWorld(worldCenter);
  }

  const material = new MeshBasicMaterial({
    name: source.name || name,
    map,
    color: (tint ?? source.color?.clone?.() ?? new Color(0xffffff)).clone(),
    side: DoubleSide,
    transparent: true,
    opacity: hasExplicitOpacity ? source.opacity : opacity,
    envMap: reflectionEnvironment.getClosestEnvMap(worldCenter),
    reflectivity: 0.35,
    depthWrite: false,
  });

  stampViewerMaterialData(material, source, tweak);
  if (viewerUvChannels) {
    material.userData.viewerUvChannels = viewerUvChannels;
  }
  applyViewerMaterialPatches(material, { tweak });

  return material;
}

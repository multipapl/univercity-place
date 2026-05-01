export function buildMeshPath(mesh) {
  if (!mesh) {
    return "";
  }

  const segments = [];
  let current = mesh;
  while (current) {
    const parent = current.parent;
    const siblingIndex = parent?.children?.indexOf(current) ?? 0;
    const label = current.name || current.type || "Object3D";
    segments.push(`${label}[${Math.max(siblingIndex, 0)}]`);

    if (current.userData?.viewerLayerId) {
      break;
    }

    current = parent ?? null;
  }

  return segments.reverse().join("/");
}

export function describeMaterialTarget(mesh, material, materialIndex = 0) {
  return {
    layerId: mesh?.userData?.viewerLayerId || material?.userData?.viewerLayerId || "",
    meshName: mesh?.name || "",
    meshPath: buildMeshPath(mesh),
    materialName: material?.userData?.sourceMaterialName || material?.name || "",
    materialSlot: Number.isInteger(materialIndex) ? materialIndex : 0,
  };
}

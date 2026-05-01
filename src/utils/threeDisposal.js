function visitTextureLike(value, onTexture) {
  if (!value) {
    return;
  }

  if (value.isTexture) {
    onTexture(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      visitTextureLike(entry, onTexture);
    });
  }
}

export function collectMaterialTextures(material, textures = new Set()) {
  if (!material?.isMaterial) {
    return textures;
  }

  Object.values(material).forEach((value) => {
    visitTextureLike(value, (texture) => {
      textures.add(texture);
    });
  });

  Object.values(material.uniforms ?? {}).forEach((uniform) => {
    visitTextureLike(uniform?.value, (texture) => {
      textures.add(texture);
    });
  });

  return textures;
}

export function disposeMaterial(material, {
  disposeTextures = true,
  seenTextures = new Set(),
} = {}) {
  if (!material?.isMaterial) {
    return;
  }

  if (disposeTextures) {
    const textures = collectMaterialTextures(material);
    textures.forEach((texture) => {
      if (seenTextures.has(texture)) {
        return;
      }

      seenTextures.add(texture);
      texture.dispose();
    });
  }

  material.dispose();
}

export function disposeObjectTree(root, {
  trackedMaterialSets = [],
  seenGeometries = new Set(),
  seenMaterials = new Set(),
  seenTextures = new Set(),
} = {}) {
  if (!root) {
    return;
  }

  root.traverse((child) => {
    if (child.geometry?.isBufferGeometry && !seenGeometries.has(child.geometry)) {
      seenGeometries.add(child.geometry);
      child.geometry.dispose();
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material?.isMaterial || seenMaterials.has(material)) {
        return;
      }

      seenMaterials.add(material);
      trackedMaterialSets.forEach((set) => {
        set.delete(material);
      });
      disposeMaterial(material, { seenTextures });
    });
  });

  root.parent?.remove(root);
}

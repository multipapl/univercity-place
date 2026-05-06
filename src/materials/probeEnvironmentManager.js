import { EquirectangularReflectionMapping, SRGBColorSpace, Vector3 } from "three";

function flipImageVertically(image) {
  const w = image.width || image.naturalWidth;
  const h = image.height || image.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.translate(0, h);
  ctx.scale(1, -1);
  ctx.drawImage(image, 0, 0);
  return canvas;
}

const DEFAULT_BOX_HALF_EXTENT = new Vector3(6, 3, 6);

export function createProbeEnvironmentManager({ pmremGenerator, boxProjectionConfig = {} }) {
  const defaultHalfExtent = boxProjectionConfig.defaultHalfExtent
    ? new Vector3(...boxProjectionConfig.defaultHalfExtent)
    : DEFAULT_BOX_HALF_EXTENT;

  const state = {
    probes: [],
  };

  function looksLikeProbeNode(name) {
    if (!name) return false;
    const normalized = name.toLowerCase().replace(/[\s_-]+/g, "_");
    return normalized.startsWith("probe_") || normalized === "probe";
  }

  function loadProbesFromGltf(gltfScene) {
    const probeNodes = [];

    gltfScene.traverse((node) => {
      if (looksLikeProbeNode(node.name)) {
        probeNodes.push(node);
      }
    });

    if (!probeNodes.length) {
      return;
    }

    const worldPosition = new Vector3();

    probeNodes.forEach((node) => {
      node.getWorldPosition(worldPosition);

      const sourceMaterial = node.material
        ?? node.children?.[0]?.material
        ?? null;
      const texture = sourceMaterial?.map || sourceMaterial?.emissiveMap || null;

      if (!texture) {
        console.warn(`Probe "${node.name}" has no texture, skipping.`);
        return;
      }

      texture.image = flipImageVertically(texture.image);
      texture.colorSpace = SRGBColorSpace;
      texture.mapping = EquirectangularReflectionMapping;
      texture.needsUpdate = true;

      const pmremTarget = pmremGenerator.fromEquirectangular(texture);
      texture.dispose();

      const probePos = worldPosition.clone();
      const boxMin = probePos.clone().sub(defaultHalfExtent);
      const boxMax = probePos.clone().add(defaultHalfExtent);

      state.probes.push({
        name: node.name,
        position: probePos,
        boxMin,
        boxMax,
        envMap: pmremTarget.texture,
        target: pmremTarget,
      });
    });

    probeNodes.forEach((node) => {
      node.removeFromParent();
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((m) => m.dispose());
      }
    });

    console.log(`Loaded ${state.probes.length} probe(s): ${state.probes.map((p) => p.name).join(", ")}.`);
  }

  function findClosestProbe(meshWorldPosition) {
    if (!state.probes.length) {
      return null;
    }

    if (state.probes.length === 1) {
      return state.probes[0];
    }

    let closestProbe = state.probes[0];
    let closestDistance = meshWorldPosition.distanceTo(closestProbe.position);

    for (let i = 1; i < state.probes.length; i++) {
      const distance = meshWorldPosition.distanceTo(state.probes[i].position);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestProbe = state.probes[i];
      }
    }

    return closestProbe;
  }

  function getClosestEnvMap(meshWorldPosition) {
    const probe = findClosestProbe(meshWorldPosition);
    return probe?.envMap ?? null;
  }

  function getClosestProbeData(meshWorldPosition) {
    return findClosestProbe(meshWorldPosition);
  }

  function hasProbes() {
    return state.probes.length > 0;
  }

  function dispose() {
    state.probes.forEach((probe) => {
      probe.target?.dispose();
    });
    state.probes = [];
  }

  return {
    dispose,
    getClosestEnvMap,
    getClosestProbeData,
    hasProbes,
    loadProbesFromGltf,
  };
}

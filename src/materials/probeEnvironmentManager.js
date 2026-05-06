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

export function createProbeEnvironmentManager({ pmremGenerator }) {
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

      state.probes.push({
        name: node.name,
        position: worldPosition.clone(),
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

  function getClosestEnvMap(meshWorldPosition) {
    if (!state.probes.length) {
      return null;
    }

    if (state.probes.length === 1) {
      return state.probes[0].envMap;
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

    return closestProbe.envMap;
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
    hasProbes,
    loadProbesFromGltf,
  };
}

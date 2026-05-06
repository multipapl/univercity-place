import {
  Box3,
  CubeCamera,
  HalfFloatType,
  LinearFilter,
  Vector3,
  WebGLCubeRenderTarget,
} from "three";

export function createRuntimeReflectionProbes({
  renderer,
  scene,
  pmremGenerator,
  config = {},
}) {
  const resolution = config.resolution ?? 256;
  const probeHeight = config.probeHeight ?? 1.5;
  const gridCountX = config.gridCountX ?? 3;
  const gridCountZ = config.gridCountZ ?? 3;
  const defaultHalfExtent = config.defaultHalfExtent
    ? new Vector3(...config.defaultHalfExtent)
    : new Vector3(6, 3, 6);

  const state = {
    capturedProbes: [],
    trackedMaterials: new Set(),
  };

  function computeProbePositions(sceneRoot) {
    const sceneBounds = new Box3();
    sceneRoot.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      if (child.material?.userData?.viewerMaterialMode === "background") return;
      child.geometry.computeBoundingBox();
      const meshBox = child.geometry.boundingBox.clone();
      meshBox.applyMatrix4(child.matrixWorld);
      sceneBounds.union(meshBox);
    });

    if (sceneBounds.isEmpty()) {
      const center = new Vector3(0, probeHeight, 0);
      return [center];
    }

    const min = sceneBounds.min;
    const max = sceneBounds.max;
    const positions = [];

    const countX = Math.max(1, gridCountX);
    const countZ = Math.max(1, gridCountZ);

    for (let ix = 0; ix < countX; ix++) {
      for (let iz = 0; iz < countZ; iz++) {
        const tx = countX === 1 ? 0.5 : ix / (countX - 1);
        const tz = countZ === 1 ? 0.5 : iz / (countZ - 1);

        const x = min.x + (max.x - min.x) * tx;
        const z = min.z + (max.z - min.z) * tz;

        positions.push(new Vector3(x, probeHeight, z));
      }
    }

    return positions;
  }

  function captureProbes(sceneRoot) {
    disposeProbes();

    const positions = computeProbePositions(sceneRoot);
    const cubeRT = new WebGLCubeRenderTarget(resolution, {
      type: HalfFloatType,
      generateMipmaps: false,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
    });
    const cubeCamera = new CubeCamera(0.1, 100, cubeRT);

    for (const position of positions) {
      cubeCamera.position.copy(position);
      cubeCamera.update(renderer, scene);

      const pmremRT = pmremGenerator.fromCubemap(cubeRT.texture);

      const boxMin = position.clone().sub(defaultHalfExtent);
      const boxMax = position.clone().add(defaultHalfExtent);

      state.capturedProbes.push({
        position: position.clone(),
        envMap: pmremRT.texture,
        pmremTarget: pmremRT,
        boxMin,
        boxMax,
      });
    }

    cubeRT.dispose();

    collectReflectiveMaterials(sceneRoot);
    assignProbesToMaterials();

    console.log(
      `Runtime reflection probes: captured ${state.capturedProbes.length} probe(s), ` +
      `tracking ${state.trackedMaterials.size} material(s).`,
    );
  }

  function collectReflectiveMaterials(sceneRoot) {
    sceneRoot.traverse((child) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((mat) => {
        if (mat?.userData?.boxProjectionUniforms) {
          state.trackedMaterials.add(mat);
        }
      });
    });
  }

  function assignProbesToMaterials() {
    if (!state.capturedProbes.length) return;

    state.trackedMaterials.forEach((material) => {
      if (!material.isMaterial) {
        state.trackedMaterials.delete(material);
        return;
      }

      const meshPos = material.userData.meshWorldCenter;
      if (!meshPos) return;

      const probe = findClosestProbe(meshPos);
      if (!probe) return;

      const hadNoEnvMap = !material.envMap;
      material.envMap = probe.envMap;
      if (hadNoEnvMap) {
        material.needsUpdate = true;
      }

      const uniforms = material.userData.boxProjectionUniforms;
      if (uniforms) {
        uniforms.boxProjectionMin.value.copy(probe.boxMin);
        uniforms.boxProjectionMax.value.copy(probe.boxMax);
        uniforms.boxProjectionPosition.value.copy(probe.position);
      }
    });
  }

  function findClosestProbe(worldPosition) {
    if (!state.capturedProbes.length) return null;

    let closest = state.capturedProbes[0];
    let closestDist = worldPosition.distanceTo(closest.position);

    for (let i = 1; i < state.capturedProbes.length; i++) {
      const dist = worldPosition.distanceTo(state.capturedProbes[i].position);
      if (dist < closestDist) {
        closestDist = dist;
        closest = state.capturedProbes[i];
      }
    }

    return closest;
  }

  function registerMaterial(material) {
    state.trackedMaterials.add(material);
  }

  function updateFromCamera(_cameraPosition) {
    // Box projection provides per-pixel parallax automatically.
    // Probes are assigned per-mesh at capture time — no per-frame switching needed.
  }

  function hasProbes() {
    return state.capturedProbes.length > 0;
  }

  function getClosestProbeData(meshWorldPosition) {
    return findClosestProbe(meshWorldPosition);
  }

  function getClosestEnvMap(meshWorldPosition) {
    const probe = findClosestProbe(meshWorldPosition);
    return probe?.envMap ?? null;
  }

  function disposeProbes() {
    state.capturedProbes.forEach((probe) => {
      probe.pmremTarget?.dispose();
    });
    state.capturedProbes = [];
  }

  function dispose() {
    disposeProbes();
    state.trackedMaterials.clear();
  }

  return {
    captureProbes,
    dispose,
    getClosestEnvMap,
    getClosestProbeData,
    hasProbes,
    registerMaterial,
    updateFromCamera,
  };
}

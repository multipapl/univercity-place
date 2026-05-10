import test from "node:test";
import assert from "node:assert/strict";
import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  MeshStandardMaterial,
} from "three";

import { createMaterialPipeline } from "../src/materials/materialPipeline.js";

function createViewerConfig() {
  return {
    materialTweaks: [],
    materialPresets: {
      background: {
        hueDegrees: 0,
        saturation: 1,
        value: 1,
        gamma: 1,
        rotationDegreesPerMinute: 0,
      },
      sky: {
        hueDegrees: 0,
        saturation: 1,
        value: 1,
        gamma: 1,
      },
      fireVideo: {
        matchIncludes: ["fire"],
      },
      translucency: {},
      reflectMaterial: {
        envMapIntensity: 1.1,
        ior: 1.5,
        specularIntensity: 1,
        defaultMetalness: 0,
        envMapRotationDegrees: 0,
        defaultRoughness: 0,
      },
      reflectUvChannels: {
        color: 0,
        roughness: 0,
        metalness: 0,
        ao: 0,
        normal: 0,
      },
      glassMaterial: {
        defaultRoughness: 0.1,
        ior: 1.01,
        transmission: 0.95,
        thickness: 0,
        envMapIntensity: 1,
      },
      glassUvChannels: {
        color: 0,
        roughness: 0,
        normal: 0,
      },
      windowsMaterial: {
        ior: 1.5,
        transmission: 0.98,
        roughness: 0.05,
        envMapIntensity: 0.8,
      },
      emissiveMaterial: {
        intensityMultiplier: 1,
      },
      fxUvChannels: {
        color: 0,
        alpha: 0,
      },
      alphaCutoutUvChannels: {
        color: 0,
        alpha: 0,
      },
    },
    runtimeOptimization: {
      frustumCulling: true,
      foliageDisableMipmaps: false,
      foliagePremultiplyAlpha: true,
      foliageAnisotropy: 4,
      useFallbackMapAlphaFromSeparateUv: false,
    },
  };
}

function createMeshWithUv() {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ]), 3),
  );
  geometry.setAttribute(
    "uv",
    new BufferAttribute(new Float32Array([
      0, 0,
      1, 0,
      0, 1,
    ]), 2),
  );

  return new Mesh(geometry, new MeshStandardMaterial({
    name: "GlassPane",
    color: 0xffffff,
  }));
}

test("createMaterialPipeline can simplify glass materials for safe VR", () => {
  const mesh = createMeshWithUv();
  const reflectionTexture = { isTexture: true, id: 1, version: 1 };
  const pipeline = createMaterialPipeline({
    viewerConfig: createViewerConfig(),
    maxSupportedAnisotropy: 1,
    backgroundState: { materials: new Set() },
    skyState: { materials: new Set() },
    fireState: { materials: new Set() },
    reflectionState: {
      envMapIntensity: 1.1,
      ior: 1.5,
      specularIntensity: 1,
      metalness: 0,
      envMapRotationY: 0,
      materials: new Set(),
      probeMaterials: new Set(),
    },
    reflectionEnvironment: {
      getClosestEnvMap() {
        return reflectionTexture;
      },
    },
    materialSafetyProfile: {
      useCheapGlassMaterial: true,
    },
  });

  pipeline.convertMeshForLayer(mesh, "glass");

  assert.equal(mesh.material.isMeshBasicMaterial, true);
  assert.equal(mesh.material.bumpMap, undefined);
  assert.equal(mesh.material.transparent, true);
  assert.equal(mesh.material.opacity, 0.18);
  assert.equal(mesh.material.envMap, reflectionTexture);
});

test("createMaterialPipeline can simplify windows materials for safe VR", () => {
  const mesh = createMeshWithUv();
  const reflectionTexture = { isTexture: true, id: 2, version: 1 };
  const pipeline = createMaterialPipeline({
    viewerConfig: createViewerConfig(),
    maxSupportedAnisotropy: 1,
    backgroundState: { materials: new Set() },
    skyState: { materials: new Set() },
    fireState: { materials: new Set() },
    reflectionState: {
      envMapIntensity: 1.1,
      ior: 1.5,
      specularIntensity: 1,
      metalness: 0,
      envMapRotationY: 0,
      materials: new Set(),
      probeMaterials: new Set(),
    },
    reflectionEnvironment: {
      getClosestEnvMap() {
        return reflectionTexture;
      },
    },
    materialSafetyProfile: {
      useCheapGlassMaterial: true,
    },
  });

  pipeline.convertMeshForLayer(mesh, "windows");

  assert.equal(mesh.material.isMeshBasicMaterial, true);
  assert.equal(mesh.material.transparent, true);
  assert.equal(mesh.material.opacity, 0.22);
  assert.equal(mesh.material.envMap, reflectionTexture);
});

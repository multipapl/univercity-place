import test from "node:test";
import assert from "node:assert/strict";

import { makeWindowsMaterial } from "../src/materials/factories/makeWindowsMaterial.js";

test("makeWindowsMaterial keeps background sharp by avoiding transmission blur and probe reflections", () => {
  const reflectionState = {
    envMapIntensity: 0.95,
    envMapRotationY: Math.PI / 2,
    materials: new Set(),
    probeMaterials: new Set(),
  };
  const material = makeWindowsMaterial({
    viewerConfig: {
      materialPresets: {
        windowsMaterial: {
          ior: 1.5,
          transmission: 0,
          opacity: 0.08,
          roughness: 0.01,
        },
      },
    },
    reflectionState,
    reflectionEnvironment: {
      getClosestEnvMap() { return null; },
    },
    sourceMaterial: {
      name: "WindowPane",
      color: {
        clone() {
          return {
            isColor: true,
          };
        },
      },
    },
    mesh: {
      geometry: {
        computeBoundingBox() {},
        boundingBox: {
          getCenter(target) {
            target.set(0, 0, 0);
          },
        },
      },
      localToWorld(target) {
        return target;
      },
    },
    findMaterialTweak() {
      return null;
    },
    stampViewerMaterialData() {},
    applyViewerMaterialPatches() {},
  });

  assert.equal(material.transparent, true);
  assert.equal(material.opacity, 0.08);
  assert.equal(material.depthWrite, false);
  assert.equal(material.transmission, 0);
  assert.equal(material.color.getHex(), 0xffffff);
  assert.equal(material.envMap, null);
  assert.equal(reflectionState.materials.has(material), false);
  assert.equal(reflectionState.probeMaterials.has(material), false);
});

const BOX_PROJECTION_FUNCTION = /* glsl */ `
uniform bool boxProjectionEnabled;
uniform vec3 boxProjectionMin;
uniform vec3 boxProjectionMax;
uniform vec3 boxProjectionPosition;

vec3 applyBoxProjection(vec3 reflectDir, vec3 worldPos) {
  if (!boxProjectionEnabled) return reflectDir;
  vec3 rbmax = (boxProjectionMax - worldPos) / reflectDir;
  vec3 rbmin = (boxProjectionMin - worldPos) / reflectDir;
  vec3 rbminmax;
  rbminmax.x = reflectDir.x > 0.0 ? rbmax.x : rbmin.x;
  rbminmax.y = reflectDir.y > 0.0 ? rbmax.y : rbmin.y;
  rbminmax.z = reflectDir.z > 0.0 ? rbmax.z : rbmin.z;
  float correction = min(min(rbminmax.x, rbminmax.y), rbminmax.z);
  vec3 boxIntersection = worldPos + reflectDir * correction;
  return normalize(boxIntersection - boxProjectionPosition);
}
`;

const INJECT_ANCHOR = "vec3 getIBLRadiance(";
const REFLECT_VEC_LINE = "reflectVec = inverseTransformDirection( reflectVec, viewMatrix );";

export function createBoxProjectionPatchApplier({ setMaterialCompileHook }) {
  return function applyBoxProjectionPatch(material, probeData) {
    if (!probeData || !probeData.boxMin || !probeData.boxMax) {
      return;
    }

    const uniforms = {
      boxProjectionEnabled: { value: true },
      boxProjectionMin: { value: probeData.boxMin.clone() },
      boxProjectionMax: { value: probeData.boxMax.clone() },
      boxProjectionPosition: { value: probeData.position.clone() },
    };

    setMaterialCompileHook(material, "boxProjection", (shader) => {
      Object.assign(shader.uniforms, uniforms);

      const anchorIdx = shader.fragmentShader.indexOf(INJECT_ANCHOR);
      if (anchorIdx === -1) {
        return;
      }
      shader.fragmentShader =
        shader.fragmentShader.slice(0, anchorIdx) +
        BOX_PROJECTION_FUNCTION + "\n" +
        shader.fragmentShader.slice(anchorIdx);

      shader.fragmentShader = shader.fragmentShader.replace(
        REFLECT_VEC_LINE,
        REFLECT_VEC_LINE + "\n\t\t\treflectVec = applyBoxProjection( reflectVec, vWorldPosition );",
      );
    });

    material.userData.boxProjectionUniforms = uniforms;
  };
}

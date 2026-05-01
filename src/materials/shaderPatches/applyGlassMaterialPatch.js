export function createGlassMaterialPatchApplier({ setMaterialCompileHook }) {
  return function applyGlassMaterialPatch(material, {
    centerOpacity,
    edgeOpacity,
    power,
    edgeTintStrength,
  } = {}) {
    setMaterialCompileHook(material, "viewerGlassPatch", (shader) => {
      shader.uniforms.viewerGlassCenterOpacity = { value: centerOpacity };
      shader.uniforms.viewerGlassEdgeOpacity = { value: edgeOpacity };
      shader.uniforms.viewerGlassPower = { value: power };
      shader.uniforms.viewerGlassEdgeTintStrength = { value: edgeTintStrength };

      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `#include <common>
varying vec3 vViewerViewPosition;
varying vec3 vViewerNormal;`,
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `#include <project_vertex>
vViewerViewPosition = -mvPosition.xyz;
vViewerNormal = normalize( normalMatrix * normal );`,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
varying vec3 vViewerViewPosition;
varying vec3 vViewerNormal;
uniform float viewerGlassCenterOpacity;
uniform float viewerGlassEdgeOpacity;
uniform float viewerGlassPower;
uniform float viewerGlassEdgeTintStrength;

float viewerGlassFresnel(vec3 normal, vec3 viewDir, float power) {
  return pow(1.0 - abs(dot(normal, viewDir)), power);
}`,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <specularmap_fragment>",
        `#include <specularmap_fragment>
vec3 viewerGlassNormal = normalize( vViewerNormal );
vec3 viewerGlassViewDir = normalize( vViewerViewPosition );
float viewerGlassFresnelValue = viewerGlassFresnel( viewerGlassNormal, viewerGlassViewDir, viewerGlassPower );
float viewerGlassOpacityValue = mix( viewerGlassCenterOpacity, viewerGlassEdgeOpacity, viewerGlassFresnelValue );
diffuseColor.a *= viewerGlassOpacityValue;`,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "vec3 outgoingLight = reflectedLight.indirectDiffuse;",
        `vec3 outgoingLight = reflectedLight.indirectDiffuse;
outgoingLight = mix( outgoingLight, vec3( 1.0 ), viewerGlassFresnelValue * viewerGlassEdgeTintStrength );`,
      );
    });
  };
}

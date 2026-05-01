import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const DEFAULT_SCENE_LAYER = 0;

const bloomCompositeShader = {
  uniforms: {
    tDiffuse: { value: null },
    bloomTexture: { value: null },
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D bloomTexture;
    varying vec2 vUv;

    void main() {
      gl_FragColor = texture2D(tDiffuse, vUv) + texture2D(bloomTexture, vUv);
    }
  `,
};

export function createSelectiveBloomPipeline({
  renderer,
  scene,
  camera,
  bloomLayerId,
  width,
  height,
}) {
  const state = {
    targetCount: 0,
  };
  const bloomLayer = new THREE.Layers();
  bloomLayer.set(bloomLayerId);
  const bloomOcclusionMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
  });
  const darkenedBloomMaterials = new Map();
  const bloomRenderPass = new RenderPass(scene, camera, null, 0x000000, 0);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0, 0, 0);
  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass(bloomRenderPass);
  bloomComposer.addPass(bloomPass);
  const finalRenderPass = new RenderPass(scene, camera);
  const bloomCompositePass = new ShaderPass(bloomCompositeShader);
  bloomCompositePass.uniforms.bloomTexture.value = bloomComposer.renderTarget2.texture;
  const outputPass = new OutputPass();
  const finalComposer = new EffectComposer(renderer);
  finalComposer.addPass(finalRenderPass);
  finalComposer.addPass(bloomCompositePass);
  finalComposer.addPass(outputPass);
  camera.layers.set(DEFAULT_SCENE_LAYER);

  function hasActiveBloom(config) {
    return config.enabled
      && config.strength > 0
      && state.targetCount > 0;
  }

  function applySettings(config) {
    bloomPass.strength = config.strength;
    bloomPass.radius = config.radius;
    bloomPass.threshold = config.threshold;
    bloomCompositePass.enabled = hasActiveBloom(config);
  }

  function syncSize(nextWidth, nextHeight, pixelRatio) {
    bloomComposer.setPixelRatio(pixelRatio);
    bloomComposer.setSize(nextWidth, nextHeight);
    finalComposer.setPixelRatio(pixelRatio);
    finalComposer.setSize(nextWidth, nextHeight);
  }

  function syncTargets(loadedLayers, config) {
    let targetCount = 0;

    loadedLayers.forEach((entry) => {
      const shouldBloom = entry.layer.id === "fx";
      entry.root.traverse((child) => {
        if (!child.isMesh) {
          return;
        }

        if (shouldBloom) {
          child.layers.enable(bloomLayerId);
          targetCount += 1;
          return;
        }

        child.layers.disable(bloomLayerId);
      });
    });

    state.targetCount = targetCount;
    applySettings(config);
  }

  function darkenNonBloomedObjects(object) {
    if (!object.isMesh || bloomLayer.test(object.layers)) {
      return;
    }

    darkenedBloomMaterials.set(object, object.material);
    object.material = bloomOcclusionMaterial;
  }

  function restoreDarkenedBloomObjects() {
    darkenedBloomMaterials.forEach((material, object) => {
      object.material = material;
    });
    darkenedBloomMaterials.clear();
  }

  function render(delta, config) {
    const shouldRenderBloom = hasActiveBloom(config);
    bloomCompositePass.enabled = shouldRenderBloom;

    if (!shouldRenderBloom) {
      camera.layers.set(DEFAULT_SCENE_LAYER);
      renderer.render(scene, camera);
      return;
    }

    const previousBackground = scene.background;
    scene.background = null;
    camera.layers.set(DEFAULT_SCENE_LAYER);
    scene.traverse(darkenNonBloomedObjects);
    try {
      bloomComposer.render(delta);
    } finally {
      restoreDarkenedBloomObjects();
      scene.background = previousBackground;
    }

    camera.layers.set(DEFAULT_SCENE_LAYER);
    finalComposer.render(delta);
  }

  function dispose() {
    restoreDarkenedBloomObjects();
    bloomComposer.dispose();
    finalComposer.dispose();
    bloomPass.dispose?.();
    bloomCompositePass.material?.dispose?.();
    outputPass.dispose?.();
    finalRenderPass.dispose?.();
    bloomRenderPass.dispose?.();
    bloomOcclusionMaterial.dispose();
  }

  return {
    applySettings,
    dispose,
    render,
    syncSize,
    syncTargets,
  };
}

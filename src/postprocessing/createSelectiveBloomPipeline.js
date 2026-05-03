import { DoubleSide, Layers, MeshBasicMaterial, Vector2 } from "three";
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
    height,
    pixelRatio: 1,
    resources: null,
    targetCount: 0,
    width,
  };
  const bloomLayer = new Layers();
  bloomLayer.set(bloomLayerId);
  camera.layers.set(DEFAULT_SCENE_LAYER);

  function hasActiveBloom(config) {
    return config.enabled
      && config.strength > 0
      && state.targetCount > 0;
  }

  function ensureResources() {
    if (state.resources) {
      return state.resources;
    }

    const bloomOcclusionMaterial = new MeshBasicMaterial({
      color: 0x000000,
      side: DoubleSide,
    });
    const darkenedBloomMaterials = new Map();
    const bloomRenderPass = new RenderPass(scene, camera, null, 0x000000, 0);
    const bloomPass = new UnrealBloomPass(new Vector2(state.width, state.height), 0, 0, 0);
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

    state.resources = {
      bloomComposer,
      bloomCompositePass,
      bloomOcclusionMaterial,
      bloomPass,
      bloomRenderPass,
      darkenedBloomMaterials,
      finalComposer,
      finalRenderPass,
      outputPass,
    };
    syncSize(state.width, state.height, state.pixelRatio);
    return state.resources;
  }

  function restoreDarkenedBloomObjects() {
    state.resources?.darkenedBloomMaterials.forEach((material, object) => {
      object.material = material;
    });
    state.resources?.darkenedBloomMaterials.clear();
  }

  function disposeResources() {
    if (!state.resources) {
      return;
    }

    restoreDarkenedBloomObjects();
    state.resources.bloomComposer.dispose();
    state.resources.finalComposer.dispose();
    state.resources.bloomPass.dispose?.();
    state.resources.bloomCompositePass.material?.dispose?.();
    state.resources.outputPass.dispose?.();
    state.resources.finalRenderPass.dispose?.();
    state.resources.bloomRenderPass.dispose?.();
    state.resources.bloomOcclusionMaterial.dispose();
    state.resources = null;
  }

  function applySettings(config) {
    if (!hasActiveBloom(config)) {
      disposeResources();
      return;
    }

    const resources = ensureResources();
    resources.bloomPass.strength = config.strength;
    resources.bloomPass.radius = config.radius;
    resources.bloomPass.threshold = config.threshold;
    resources.bloomCompositePass.enabled = true;
  }

  function syncSize(nextWidth, nextHeight, pixelRatio) {
    state.width = nextWidth;
    state.height = nextHeight;
    state.pixelRatio = pixelRatio;
    if (!state.resources) {
      return;
    }

    state.resources.bloomComposer.setPixelRatio(pixelRatio);
    state.resources.bloomComposer.setSize(nextWidth, nextHeight);
    state.resources.finalComposer.setPixelRatio(pixelRatio);
    state.resources.finalComposer.setSize(nextWidth, nextHeight);
  }

  function syncTargets(loadedLayers, config) {
    let targetCount = 0;

    loadedLayers.forEach((entry) => {
      const shouldBloom = entry.layer.runtime?.enableBloom === true;
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

    state.resources.darkenedBloomMaterials.set(object, object.material);
    object.material = state.resources.bloomOcclusionMaterial;
  }

  function render(delta, config) {
    const shouldRenderBloom = hasActiveBloom(config);

    if (!shouldRenderBloom) {
      camera.layers.set(DEFAULT_SCENE_LAYER);
      renderer.render(scene, camera);
      return;
    }

    const resources = ensureResources();
    resources.bloomCompositePass.enabled = true;
    const previousBackground = scene.background;
    scene.background = null;
    camera.layers.set(DEFAULT_SCENE_LAYER);
    scene.traverse(darkenNonBloomedObjects);
    try {
      resources.bloomComposer.render(delta);
    } finally {
      restoreDarkenedBloomObjects();
      scene.background = previousBackground;
    }

    camera.layers.set(DEFAULT_SCENE_LAYER);
    resources.finalComposer.render(delta);
  }

  function dispose() {
    disposeResources();
  }

  return {
    applySettings,
    dispose,
    render,
    syncSize,
    syncTargets,
  };
}

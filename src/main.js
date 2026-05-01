import "./style.css";

import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {
  getMissingSceneStatusMessage,
  SCENE_LOAD_STATUS_HTML,
  VIEWER_CONFIG,
} from "./config/viewerConfig.js";
import { appendAssetQuery } from "./loaders/assetResolver.js";
import { createNavigationController } from "./camera/navigationController.js";
import { createDebugObjectInspector } from "./debug/debugObjectInspector.js";
import { createPerformanceDiagnostics } from "./diagnostics/performanceDiagnostics.js";
import { createSceneLayerLoader } from "./loaders/sceneLayerLoader.js";
import { createMaterialPipeline } from "./materials/materialPipeline.js";
import { createReflectionEnvironmentManager } from "./materials/reflectionEnvironment.js";
import { bindViewerUiEvents } from "./ui/debugPanelBindings.js";
import { createMenuController } from "./ui/menuController.js";
import { createViewerShell } from "./ui/createViewerShell.js";
import { collectViewerDomRefs, createDebugInspectorUi } from "./ui/viewerDomRefs.js";
import { disposeObjectTree } from "./utils/threeDisposal.js";

function renderInitializationError(error) {
  console.error("Viewer initialization failed.", error);

  const errorMessage = error instanceof Error
    ? error.message
    : "Unexpected startup error.";
  const shell = document.createElement("div");
  shell.style.cssText = "min-height:100vh;display:grid;place-items:center;padding:24px;background:#050816;color:#e2e8f0;font-family:system-ui,sans-serif;";

  const card = document.createElement("div");
  card.style.cssText = "max-width:560px;padding:24px;border:1px solid rgba(148,163,184,0.3);border-radius:20px;background:rgba(15,23,42,0.9);box-shadow:0 20px 60px rgba(0,0,0,0.35);";

  const title = document.createElement("h1");
  title.textContent = "Viewer failed to start";
  title.style.cssText = "margin:0 0 12px;font-size:1.5rem;";

  const body = document.createElement("p");
  body.textContent = `${errorMessage} Check the browser console for technical details.`;
  body.style.cssText = "margin:0;line-height:1.6;color:#cbd5e1;";

  card.append(title, body);
  shell.append(card);

  const app = document.querySelector("#app");
  if (app) {
    app.replaceChildren(shell);
    return;
  }

  document.body.replaceChildren(shell);
}

let disposeOnInitFailure = null;

try {
const app = document.querySelector("#app");
const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
const isWalkMode = VIEWER_CONFIG.locomotion.mode === "walk";
const desktopControlText = isWalkMode
  ? "<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk, <kbd>Shift</kbd> sprint, mouse looks around, <kbd>Esc</kbd> unlocks cursor."
  : "<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move, <kbd>Space</kbd> up, <kbd>C</kbd> down, <kbd>Shift</kbd> boost, mouse wheel changes speed, <kbd>Esc</kbd> unlocks cursor.";
const touchControlText = isWalkMode
  ? "Left thumb walks, right side looks around, boost button sprints."
  : "Left thumb moves, right side looks around, buttons on the right control up, down and boost.";

const {
  viewport,
  hud,
  loadingScreen,
  crosshair,
  mobileControls,
} = createViewerShell({
  app,
  isTouchDevice,
  isWalkMode,
  viewerConfig: VIEWER_CONFIG,
  sceneLoadStatusHtml: SCENE_LOAD_STATUS_HTML,
  desktopControlText,
  touchControlText,
});

const refs = collectViewerDomRefs({
  hud,
  loadingScreen,
  mobileControls,
});
const {
  statusLine,
  loadingStatusLine,
  menuToggleButton,
  hudPanel,
  debugOnlySections,
  toneMappingSelect,
  exposureSlider,
  exposureValue,
  selectiveBloomStrengthSlider,
  selectiveBloomStrengthValue,
  cameraFovSlider,
  cameraFovValue,
  cameraHeightSlider,
  cameraHeightValue,
  showCrosshairToggle,
  cameraShakeToggle,
  backgroundHueSlider,
  backgroundHueValue,
  backgroundSaturationSlider,
  backgroundSaturationValue,
  backgroundValueSlider,
  backgroundValueOutput,
  fireHueSlider,
  fireHueValue,
  fireSaturationSlider,
  fireSaturationValue,
  fireValueSlider,
  fireValueOutput,
  reflectEnvIntensitySlider,
  reflectEnvIntensityValue,
  reflectIorSlider,
  reflectIorValue,
  reflectSpecularSlider,
  reflectSpecularValue,
  reflectMetalnessSlider,
  reflectMetalnessValue,
  layerControls,
  statFps,
  statFrameMs,
  statDrawCalls,
  statTriangles,
  statTextures,
  statTextureMemory,
  performanceNote,
  baseLowMemoryToggle,
  baseTextureCapSelect,
  debugSessionNote,
  joystickBase,
  joystickThumb,
  lookPad,
  flyUpButton,
  flyDownButton,
  boostButton,
} = refs;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;
viewport.prepend(renderer.domElement);
const maxSupportedAnisotropy = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
scene.background = new THREE.Color("#050816");
const reflectionPmremGenerator = new THREE.PMREMGenerator(renderer);
reflectionPmremGenerator.compileCubemapShader();
const sceneRoots = new THREE.Group();
scene.add(sceneRoots);

const camera = new THREE.PerspectiveCamera(
  VIEWER_CONFIG.camera.fov,
  window.innerWidth / window.innerHeight,
  0.05,
  5000,
);
camera.up.set(0, 1, 0);
camera.position.set(0, 1.7, 4);

const clock = new THREE.Clock();
const searchParams = new URLSearchParams(window.location.search);
const DEFAULT_SCENE_LAYER = 0;
const BLOOM_SCENE_LAYER = VIEWER_CONFIG.postProcessing.selectiveBloom.layer;
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
const selectiveBloomConfig = VIEWER_CONFIG.postProcessing.selectiveBloom;
const bloomState = {
  targetCount: 0,
};
const viewerLifecycle = {
  animationFrameId: null,
  disposed: false,
};
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE_LAYER);
const bloomOcclusionMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000,
  side: THREE.DoubleSide,
});
const darkenedBloomMaterials = new Map();
const bloomRenderPass = new RenderPass(scene, camera, null, 0x000000, 0);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  selectiveBloomConfig.strength,
  selectiveBloomConfig.radius,
  selectiveBloomConfig.threshold,
);
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

function parseBooleanFlag(value) {
  if (value == null) {
    return null;
  }

  const normalized = `${value}`.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

function getStoredLowMemoryBaseMode() {
  try {
    return parseBooleanFlag(window.localStorage.getItem("viewer.lowMemoryBaseMipmaps"));
  } catch {
    return null;
  }
}

function parsePositiveInteger(value) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number.parseInt(`${value}`, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function getStoredBaseTextureCap() {
  try {
    return parsePositiveInteger(window.localStorage.getItem("viewer.baseTextureMaxSize"));
  } catch {
    return null;
  }
}

VIEWER_CONFIG.runtimeOptimization.lowMemoryBaseMipmaps = parseBooleanFlag(searchParams.get("lowMemoryBase"))
  ?? getStoredLowMemoryBaseMode()
  ?? VIEWER_CONFIG.runtimeOptimization.lowMemoryBaseMipmaps;
VIEWER_CONFIG.runtimeOptimization.baseTextureMaxSize = parsePositiveInteger(searchParams.get("baseTextureCap"))
  ?? getStoredBaseTextureCap()
  ?? VIEWER_CONFIG.runtimeOptimization.baseTextureMaxSize;
let debugMode = parseBooleanFlag(searchParams.get("debug")) ?? false;
const assetBustValue = searchParams.get("assetBust");
const isLocalAssetDevelopment = import.meta.env.DEV
  || ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
const assetQuery = debugMode
  ? `v=${encodeURIComponent(assetBustValue || `${Date.now()}`)}`
  : (assetBustValue
      ? `v=${encodeURIComponent(assetBustValue)}`
      : (isLocalAssetDevelopment ? `v=${encodeURIComponent(`${Date.now()}`)}` : ""));

try {
  window.localStorage.removeItem("viewer.debugMode");
} catch {
  // Ignore storage failures and continue with query-only debug mode.
}

function shouldAppendAssetQuery(url) {
  if (!assetQuery || !url || /^data:|^blob:/i.test(url)) {
    return false;
  }

  try {
    const resolvedUrl = new URL(url, window.location.href);
    return resolvedUrl.origin === window.location.origin
      && !resolvedUrl.pathname.startsWith("/draco/");
  } catch {
    return false;
  }
}

const loadingManager = new THREE.LoadingManager();
loadingManager.setURLModifier((url) => (
  shouldAppendAssetQuery(url)
    ? appendAssetQuery(url, assetQuery)
    : url
));

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
const loader = new GLTFLoader(loadingManager);
loader.setDRACOLoader(dracoLoader);
const textureLoader = new THREE.TextureLoader(loadingManager);

const diagnosticsState = {
  loadedLayers: [],
  frameAccumulator: 0,
  frameCounter: 0,
  fps: 0,
  frameMs: 0,
  lastUpdateAt: 0,
};
const backgroundState = {
  hueDegrees: VIEWER_CONFIG.materialPresets.background.hueDegrees,
  saturation: VIEWER_CONFIG.materialPresets.background.saturation,
  value: VIEWER_CONFIG.materialPresets.background.value,
  materials: new Set(),
  roots: new Set(),
  motionTime: 0,
  rotationRadiansPerSecond:
    THREE.MathUtils.degToRad(VIEWER_CONFIG.materialPresets.background.rotationDegreesPerMinute) / 60,
};
const fireState = {
  hueDegrees: VIEWER_CONFIG.materialPresets.fireVideo.hueDegrees,
  saturation: VIEWER_CONFIG.materialPresets.fireVideo.saturation,
  value: VIEWER_CONFIG.materialPresets.fireVideo.value,
  materials: new Set(),
};
const reflectionState = {
  envMapIntensity: VIEWER_CONFIG.materialPresets.reflectMaterial.envMapIntensity,
  ior: VIEWER_CONFIG.materialPresets.reflectMaterial.ior,
  specularIntensity: VIEWER_CONFIG.materialPresets.reflectMaterial.specularIntensity,
  metalness: VIEWER_CONFIG.materialPresets.reflectMaterial.defaultMetalness,
  materials: new Set(),
};
const fallbackSceneRoots = [];
const reflectionEnvironment = createReflectionEnvironmentManager({
  viewerConfig: VIEWER_CONFIG,
  searchParams,
  assetQuery,
  reflectionPmremGenerator,
  scene,
  textureLoader,
  updateStatus,
});
const materialPipeline = createMaterialPipeline({
  viewerConfig: VIEWER_CONFIG,
  maxSupportedAnisotropy,
  backgroundState,
  fireState,
  reflectionState,
  reflectionEnvironment,
});
const performanceDiagnostics = createPerformanceDiagnostics({
  enabled: true,
  detailedStatsEnabled: debugMode,
  renderer,
  diagnosticsState,
  runtimeOptimization: VIEWER_CONFIG.runtimeOptimization,
  statsElements: {
    statFps,
    statFrameMs,
    statDrawCalls,
    statTriangles,
    statTextures,
    statTextureMemory,
    performanceNote,
  },
  getTextureDimensions: materialPipeline.getTextureDimensions,
});
const updatePerformanceDiagnostics = () => {
  performanceDiagnostics.update();
};
const debugObjectInspector = createDebugObjectInspector({
  enabled: debugMode,
  isDev: import.meta.env.DEV,
  assetQuery,
  camera,
  sceneRoots,
  rendererDomElement: renderer.domElement,
  materialPipeline,
  updateStatus,
  getMenuOpen: () => menuController.isOpen(),
  ui: createDebugInspectorUi(refs),
});
const navigationController = createNavigationController({
  camera,
  renderer,
  viewport,
  joystickBase,
  joystickThumb,
  lookPad,
  flyUpButton,
  flyDownButton,
  boostButton,
  isTouchDevice,
  isWalkMode,
  viewerConfig: VIEWER_CONFIG,
  updateStatus,
});
const toneMappingModes = {
  standard: THREE.LinearToneMapping,
  none: THREE.NoToneMapping,
};
const menuController = createMenuController({
  viewport,
  hud,
  hudPanel,
  menuToggleButton,
  isTouchDevice,
  navigationController,
  updateStatus,
});

if (baseLowMemoryToggle) {
  baseLowMemoryToggle.checked = VIEWER_CONFIG.runtimeOptimization.lowMemoryBaseMipmaps;
}

if (baseTextureCapSelect) {
  baseTextureCapSelect.value = `${VIEWER_CONFIG.runtimeOptimization.baseTextureMaxSize}`;
}

function updateStatus(message) {
  statusLine.textContent = message;
  if (loadingStatusLine) {
    loadingStatusLine.textContent = message;
  }
}

function updateDebugSessionNote() {
  if (!debugSessionNote) {
    return;
  }

  if (!debugMode) {
    debugSessionNote.textContent = "Debug tools are disabled for this URL.";
    return;
  }

  debugSessionNote.textContent = `Debug tools are active. Asset token: ${assetQuery || "none"}. Reload Assets forces a fresh scene fetch.`;
}

function setLoadingScreenVisible(visible) {
  if (!loadingScreen) {
    return;
  }

  if (visible) {
    loadingScreen.hidden = false;
    loadingScreen.classList.add("is-visible");
    return;
  }

  loadingScreen.classList.remove("is-visible");
  window.setTimeout(() => {
    if (!loadingScreen.classList.contains("is-visible")) {
      loadingScreen.hidden = true;
    }
  }, 320);
}

function applyViewportColorSettings() {
  const toneMappingKey = VIEWER_CONFIG.colorPipeline.toneMapping in toneMappingModes
    ? VIEWER_CONFIG.colorPipeline.toneMapping
    : "standard";
  renderer.toneMapping = toneMappingModes[toneMappingKey];
  renderer.toneMappingExposure = VIEWER_CONFIG.colorPipeline.exposure;

  if (toneMappingSelect) {
    toneMappingSelect.value = toneMappingKey;
  }

  if (exposureSlider) {
    exposureSlider.value = VIEWER_CONFIG.colorPipeline.exposure.toFixed(2);
  }

  if (exposureValue) {
    exposureValue.value = VIEWER_CONFIG.colorPipeline.exposure.toFixed(2);
    exposureValue.textContent = VIEWER_CONFIG.colorPipeline.exposure.toFixed(2);
  }
}

function hasActiveSelectiveBloom() {
  return selectiveBloomConfig.enabled
    && selectiveBloomConfig.strength > 0
    && bloomState.targetCount > 0;
}

function applySelectiveBloomSettings() {
  bloomPass.strength = selectiveBloomConfig.strength;
  bloomPass.radius = selectiveBloomConfig.radius;
  bloomPass.threshold = selectiveBloomConfig.threshold;
  bloomCompositePass.enabled = hasActiveSelectiveBloom();

  if (selectiveBloomStrengthSlider) {
    selectiveBloomStrengthSlider.value = selectiveBloomConfig.strength.toFixed(2);
  }

  if (selectiveBloomStrengthValue) {
    selectiveBloomStrengthValue.value = selectiveBloomConfig.strength.toFixed(2);
    selectiveBloomStrengthValue.textContent = selectiveBloomConfig.strength.toFixed(2);
  }
}

function syncPostProcessingSize() {
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  bloomComposer.setPixelRatio(pixelRatio);
  bloomComposer.setSize(window.innerWidth, window.innerHeight);
  finalComposer.setPixelRatio(pixelRatio);
  finalComposer.setSize(window.innerWidth, window.innerHeight);
}

function syncSelectiveBloomTargets(loadedLayers) {
  let targetCount = 0;

  loadedLayers.forEach((entry) => {
    const shouldBloom = entry.layer.id === "fx";
    entry.root.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      if (shouldBloom) {
        child.layers.enable(BLOOM_SCENE_LAYER);
        targetCount += 1;
        return;
      }

      child.layers.disable(BLOOM_SCENE_LAYER);
    });
  });

  bloomState.targetCount = targetCount;
  applySelectiveBloomSettings();
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

function renderSceneFrame(delta) {
  const shouldRenderBloom = hasActiveSelectiveBloom();
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

function applyCameraSettings() {
  navigationController.applyCameraSettings();

  if (cameraFovSlider) {
    cameraFovSlider.value = navigationController.cameraState.fov.toFixed(0);
  }

  if (cameraFovValue) {
    cameraFovValue.value = `${navigationController.cameraState.fov.toFixed(0)}°`;
    cameraFovValue.textContent = `${navigationController.cameraState.fov.toFixed(0)}°`;
  }

  if (cameraHeightSlider) {
    cameraHeightSlider.value = navigationController.cameraState.height.toFixed(2);
  }

  if (cameraHeightValue) {
    cameraHeightValue.value = navigationController.cameraState.height.toFixed(2);
    cameraHeightValue.textContent = navigationController.cameraState.height.toFixed(2);
  }
}

function applyCameraMotionSettings() {
  if (cameraShakeToggle) {
    cameraShakeToggle.checked = VIEWER_CONFIG.camera.ambientMotion.enabled;
  }
}

function clearCameraAmbientMotion() {
  navigationController.clearCameraAmbientMotion();
}

function applyCameraAmbientMotion(delta) {
  navigationController.applyCameraAmbientMotion(delta);
}

function applyInterfaceSettings() {
  if (showCrosshairToggle) {
    showCrosshairToggle.checked = VIEWER_CONFIG.interface.showCrosshair;
  }

  if (isTouchDevice) {
    crosshair.style.display = "none";
    return;
  }

  crosshair.style.display = VIEWER_CONFIG.interface.showCrosshair ? "" : "none";
}

function applyDebugModeSettings() {
  hud.classList.toggle("is-debug-mode", debugMode);
  debugOnlySections.forEach((section) => {
    section.hidden = !debugMode;
  });

  if (menuToggleButton) {
    menuToggleButton.querySelector("span").textContent = debugMode ? "Debug Menu" : "Menu";
  }

  updateDebugSessionNote();
}

function applyBackgroundColorSettings() {
  if (backgroundHueSlider) {
    backgroundHueSlider.value = backgroundState.hueDegrees.toFixed(0);
  }

  if (backgroundHueValue) {
    backgroundHueValue.value = `${backgroundState.hueDegrees.toFixed(0)}°`;
    backgroundHueValue.textContent = `${backgroundState.hueDegrees.toFixed(0)}°`;
  }

  if (backgroundSaturationSlider) {
    backgroundSaturationSlider.value = backgroundState.saturation.toFixed(2);
  }

  if (backgroundSaturationValue) {
    backgroundSaturationValue.value = backgroundState.saturation.toFixed(2);
    backgroundSaturationValue.textContent = backgroundState.saturation.toFixed(2);
  }

  if (backgroundValueSlider) {
    backgroundValueSlider.value = backgroundState.value.toFixed(2);
  }

  if (backgroundValueOutput) {
    backgroundValueOutput.value = backgroundState.value.toFixed(2);
    backgroundValueOutput.textContent = backgroundState.value.toFixed(2);
  }

  backgroundState.materials.forEach((material) => {
    const uniforms = material.uniforms ?? material.userData.viewerBackgroundUniforms;
    if (!uniforms) {
      return;
    }

    uniforms.viewerBackgroundHue.value = backgroundState.hueDegrees / 360;
    uniforms.viewerBackgroundSaturation.value = backgroundState.saturation;
    uniforms.viewerBackgroundValue.value = backgroundState.value;
    material.uniformsNeedUpdate = true;
  });
}

function updateBackgroundMotion(delta) {
  backgroundState.motionTime += delta;

  backgroundState.materials.forEach((material) => {
    const uniforms = material.uniforms ?? material.userData.viewerBackgroundUniforms;
    if (!uniforms?.viewerBackgroundTime) {
      return;
    }

    uniforms.viewerBackgroundTime.value = backgroundState.motionTime;
  });

  if (!backgroundState.rotationRadiansPerSecond || !backgroundState.roots.size) {
    return;
  }

  backgroundState.roots.forEach((root) => {
    root.rotation.y += backgroundState.rotationRadiansPerSecond * delta;
  });
}

function applyFireColorSettings() {
  if (fireHueSlider) {
    fireHueSlider.value = fireState.hueDegrees.toFixed(0);
  }

  if (fireHueValue) {
    fireHueValue.value = `${fireState.hueDegrees.toFixed(0)}°`;
    fireHueValue.textContent = `${fireState.hueDegrees.toFixed(0)}°`;
  }

  if (fireSaturationSlider) {
    fireSaturationSlider.value = fireState.saturation.toFixed(2);
  }

  if (fireSaturationValue) {
    fireSaturationValue.value = fireState.saturation.toFixed(2);
    fireSaturationValue.textContent = fireState.saturation.toFixed(2);
  }

  if (fireValueSlider) {
    fireValueSlider.value = fireState.value.toFixed(2);
  }

  if (fireValueOutput) {
    fireValueOutput.value = fireState.value.toFixed(2);
    fireValueOutput.textContent = fireState.value.toFixed(2);
  }

  fireState.materials.forEach((material) => {
    const uniforms = material.userData.viewerFireUniforms;
    if (!uniforms) {
      return;
    }

    uniforms.viewerFireHue.value = fireState.hueDegrees / 360;
    uniforms.viewerFireSaturation.value = fireState.saturation;
    uniforms.viewerFireValue.value = fireState.value;
  });
}

function applyReflectMaterialSettings() {
  if (reflectEnvIntensitySlider) {
    reflectEnvIntensitySlider.value = reflectionState.envMapIntensity.toFixed(2);
  }

  if (reflectEnvIntensityValue) {
    reflectEnvIntensityValue.value = reflectionState.envMapIntensity.toFixed(2);
    reflectEnvIntensityValue.textContent = reflectionState.envMapIntensity.toFixed(2);
  }

  if (reflectIorSlider) {
    reflectIorSlider.value = reflectionState.ior.toFixed(2);
  }

  if (reflectIorValue) {
    reflectIorValue.value = reflectionState.ior.toFixed(2);
    reflectIorValue.textContent = reflectionState.ior.toFixed(2);
  }

  if (reflectSpecularSlider) {
    reflectSpecularSlider.value = reflectionState.specularIntensity.toFixed(2);
  }

  if (reflectSpecularValue) {
    reflectSpecularValue.value = reflectionState.specularIntensity.toFixed(2);
    reflectSpecularValue.textContent = reflectionState.specularIntensity.toFixed(2);
  }

  if (reflectMetalnessSlider) {
    reflectMetalnessSlider.value = reflectionState.metalness.toFixed(2);
  }

  if (reflectMetalnessValue) {
    reflectMetalnessValue.value = reflectionState.metalness.toFixed(2);
    reflectMetalnessValue.textContent = reflectionState.metalness.toFixed(2);
  }

  reflectionState.materials.forEach((material) => {
    material.envMapIntensity = reflectionState.envMapIntensity;
    material.metalness = reflectionState.metalness;

    if (material.isMeshPhysicalMaterial) {
      material.ior = reflectionState.ior;
      material.specularIntensity = reflectionState.specularIntensity;
    }

    material.needsUpdate = true;
  });
}

function renderLayerControls() {
  if (!layerControls) {
    return;
  }

  if (!debugMode) {
    layerControls.innerHTML = "";
    return;
  }

  if (!diagnosticsState.loadedLayers.length) {
    layerControls.innerHTML = `<p class="empty-state">Layers will appear here after scene load.</p>`;
    return;
  }

  layerControls.innerHTML = "";

  diagnosticsState.loadedLayers.forEach((entry) => {
    const label = document.createElement("label");
    label.className = "layer-toggle";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = entry.root.visible;
    checkbox.addEventListener("change", () => {
      entry.root.visible = checkbox.checked;
      updatePerformanceDiagnostics();
      updateStatus(`${entry.layer.label} layer ${checkbox.checked ? "enabled" : "disabled"}.`);
    });

    const textWrap = document.createElement("span");
    textWrap.className = "layer-toggle-copy";
    textWrap.innerHTML = debugMode
      ? `<strong>${entry.layer.label}</strong><small>${entry.layer.id} · ${entry.layer.url}</small>`
      : `<strong>${entry.layer.label}</strong><small>${entry.layer.id}</small>`;

    label.append(checkbox, textWrap);
    layerControls.append(label);
  });
}

function reloadWithUpdatedSearchParams(mutator) {
  const nextUrl = new URL(window.location.href);
  mutator(nextUrl.searchParams);
  window.location.assign(nextUrl.toString());
}

function setDebugMode(nextEnabled) {
  const normalizedEnabled = Boolean(nextEnabled);
  if (debugMode === normalizedEnabled) {
    return;
  }

  debugMode = normalizedEnabled;
  const nextUrl = new URL(window.location.href);
  if (debugMode) {
    nextUrl.searchParams.set("debug", "1");
  } else {
    nextUrl.searchParams.delete("debug");
  }
  window.history.replaceState({}, "", nextUrl.toString());

  performanceDiagnostics.setDetailedStatsEnabled(debugMode);
  debugObjectInspector.setEnabled(debugMode);
  applyDebugModeSettings();
  renderLayerControls();
  updatePerformanceDiagnostics();
  updateStatus(debugMode
    ? "Debug mode enabled. Scene stayed live; advanced tools are now available."
    : "Debug mode disabled. Scene stayed live; advanced tools are hidden.");
}

function applyRuntimeTextureOptimizations() {
  materialPipeline.applyRuntimeTextureOptimizations(diagnosticsState.loadedLayers);
  updatePerformanceDiagnostics();
}

function setBaseLowMemoryMode(enabled) {
  VIEWER_CONFIG.runtimeOptimization.lowMemoryBaseMipmaps = enabled;

  if (baseLowMemoryToggle) {
    baseLowMemoryToggle.checked = enabled;
  }

  try {
    window.localStorage.setItem("viewer.lowMemoryBaseMipmaps", enabled ? "1" : "0");
  } catch {
    // Ignore storage failures and keep the setting in-memory for this session.
  }

  applyRuntimeTextureOptimizations();
  updateStatus(`Low-memory base textures ${enabled ? "enabled" : "disabled"}.`);
}

function setBaseTextureCap(nextCap) {
  const cap = Number.isFinite(nextCap) && nextCap > 0 ? Math.round(nextCap) : 0;
  VIEWER_CONFIG.runtimeOptimization.baseTextureMaxSize = cap;

  if (baseTextureCapSelect) {
    baseTextureCapSelect.value = `${cap}`;
  }

  try {
    window.localStorage.setItem("viewer.baseTextureMaxSize", `${cap}`);
  } catch {
    // Ignore storage failures and keep the setting in-memory for this session.
  }

  applyRuntimeTextureOptimizations();
  updateStatus(cap ? `Base texture cap set to ${cap}px.` : "Base texture cap disabled.");
}

function positionCameraAtSpawn(root) {
  navigationController.positionCameraAtSpawn(root, materialPipeline.isGameplayMesh);
}

function clearFallbackScene() {
  const seenGeometries = new Set();
  const seenMaterials = new Set();
  const seenTextures = new Set();

  while (fallbackSceneRoots.length) {
    const root = fallbackSceneRoots.pop();
    disposeObjectTree(root, {
      seenGeometries,
      seenMaterials,
      seenTextures,
    });
  }
}

function addFallbackScene() {
  clearFallbackScene();

  const grid = new THREE.GridHelper(24, 24, 0x93c5fd, 0x334155);
  grid.position.y = -0.001;
  scene.add(grid);
  fallbackSceneRoots.push(grid);

  const room = new THREE.Group();
  const wallMaterial = new THREE.MeshBasicMaterial({ color: "#1e293b", wireframe: true });
  const roomMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 8), wallMaterial);
  roomMesh.position.y = 2;
  room.add(roomMesh);
  scene.add(room);
  fallbackSceneRoots.push(room);

  updateStatus(getMissingSceneStatusMessage());
  setLoadingScreenVisible(false);
}

const sceneLayerLoader = createSceneLayerLoader({
  viewerConfig: VIEWER_CONFIG,
  searchParams,
  assetQuery,
  gltfLoader: loader,
  sceneRoots,
  backgroundRoots: backgroundState.roots,
  diagnosticsState,
  ensureReflectionEnvironment: () => reflectionEnvironment.ensureEnvironment(),
  convertMeshForLayer: materialPipeline.convertMeshForLayer,
  matchesFireVideoTarget: materialPipeline.matchesFireVideoTarget,
  getFallbackTextureChannel: materialPipeline.getFallbackTextureChannel,
  applyTextureChannelOverride: materialPipeline.applyTextureChannelOverride,
  applyFireVideoMaterialPatch: materialPipeline.applyFireVideoMaterialPatch,
  updateStatus,
  addFallbackScene,
  renderLayerControls,
  clearFallbackScene,
  applyBackgroundColorSettings,
  applyFireColorSettings,
  applyReflectMaterialSettings,
  applyRuntimeTextureOptimizations,
  updatePerformanceDiagnostics,
  positionCameraAtSpawn,
  applyCameraSettings,
  setLoadingScreenVisible,
  onLayersLoaded: (loadedLayers) => {
    syncSelectiveBloomTargets(loadedLayers);
    debugObjectInspector.setLoadedLayers(loadedLayers);
  },
  isTouchDevice,
  isWalkMode,
  trackedMaterialSets: [
    backgroundState.materials,
    fireState.materials,
    reflectionState.materials,
  ],
});

function disposeViewerResources() {
  if (viewerLifecycle.disposed) {
    return;
  }

  viewerLifecycle.disposed = true;
  if (viewerLifecycle.animationFrameId !== null) {
    window.cancelAnimationFrame(viewerLifecycle.animationFrameId);
    viewerLifecycle.animationFrameId = null;
  }

  sceneLayerLoader.dispose();
  clearFallbackScene();
  restoreDarkenedBloomObjects();
  darkenedBloomMaterials.clear();
  reflectionEnvironment.dispose();
  bloomComposer.dispose();
  finalComposer.dispose();
  bloomPass.dispose?.();
  bloomCompositePass.material?.dispose?.();
  outputPass.dispose?.();
  finalRenderPass.dispose?.();
  bloomRenderPass.dispose?.();
  bloomOcclusionMaterial.dispose();
  reflectionPmremGenerator.dispose();
  renderer.renderLists.dispose();
  renderer.dispose();
}

disposeOnInitFailure = disposeViewerResources;

window.addEventListener("beforeunload", disposeViewerResources, { once: true });
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeViewerResources();
  });
}

navigationController.bindInputEvents({
  getMenuOpen: () => menuController.isOpen(),
  onToggleMenu: () => menuController.setOpen(!menuController.isOpen()),
  onCloseMenu: () => menuController.setOpen(false),
  onResumeFireVideo: () => sceneLayerLoader.resumeFireVideoPlayback(),
});
window.addEventListener("resize", syncPostProcessingSize);
debugObjectInspector.bindUi();
debugObjectInspector.setEnabled(debugMode);

bindViewerUiEvents({
  refs,
  onToneMappingChange: (value) => {
    VIEWER_CONFIG.colorPipeline.toneMapping = value;
    applyViewportColorSettings();
  },
  onExposureChange: (value) => {
    VIEWER_CONFIG.colorPipeline.exposure = value;
    applyViewportColorSettings();
  },
  onSelectiveBloomStrengthChange: (value) => {
    selectiveBloomConfig.strength = value;
    applySelectiveBloomSettings();
  },
  onCameraFovChange: (value) => {
    navigationController.cameraState.fov = value;
    applyCameraSettings();
  },
  onCameraHeightChange: (value) => {
    navigationController.cameraState.height = value;
    applyCameraSettings();
  },
  onShowCrosshairChange: (checked) => {
    VIEWER_CONFIG.interface.showCrosshair = checked;
    applyInterfaceSettings();
  },
  onCameraShakeChange: (checked) => {
    VIEWER_CONFIG.camera.ambientMotion.enabled = checked;
    clearCameraAmbientMotion();
    navigationController.applyLookState();
    applyCameraMotionSettings();
  },
  onBackgroundHueChange: (value) => {
    backgroundState.hueDegrees = value;
    applyBackgroundColorSettings();
  },
  onBackgroundSaturationChange: (value) => {
    backgroundState.saturation = value;
    applyBackgroundColorSettings();
  },
  onBackgroundValueChange: (value) => {
    backgroundState.value = value;
    applyBackgroundColorSettings();
  },
  onFireHueChange: (value) => {
    fireState.hueDegrees = value;
    applyFireColorSettings();
  },
  onFireSaturationChange: (value) => {
    fireState.saturation = value;
    applyFireColorSettings();
  },
  onFireValueChange: (value) => {
    fireState.value = value;
    applyFireColorSettings();
  },
  onReflectEnvIntensityChange: (value) => {
    reflectionState.envMapIntensity = value;
    applyReflectMaterialSettings();
  },
  onReflectIorChange: (value) => {
    reflectionState.ior = value;
    applyReflectMaterialSettings();
  },
  onReflectSpecularChange: (value) => {
    reflectionState.specularIntensity = value;
    applyReflectMaterialSettings();
  },
  onReflectMetalnessChange: (value) => {
    reflectionState.metalness = value;
    applyReflectMaterialSettings();
  },
  onBaseLowMemoryToggle: (checked) => {
    setBaseLowMemoryMode(checked);
  },
  onBaseTextureCapChange: (value) => {
    setBaseTextureCap(parsePositiveInteger(value) ?? 0);
  },
  onMenuToggle: () => {
    menuController.setOpen(!menuController.isOpen());
  },
  onToggleDebugMode: () => {
    setDebugMode(!debugMode);
  },
  onMenuClose: () => {
    menuController.setOpen(false);
  },
  onReloadAssets: () => {
    reloadWithUpdatedSearchParams((nextSearchParams) => {
      nextSearchParams.set("assetBust", `${Date.now()}`);
      if (debugMode) {
        nextSearchParams.set("debug", "1");
      }
    });
  },
  onExitDebug: () => {
    setDebugMode(false);
  },
});

function animate() {
  if (viewerLifecycle.disposed) {
    return;
  }

  const delta = clock.getDelta();
  clearCameraAmbientMotion();
  sceneLayerLoader.syncFireVideoPlayback();
  updateBackgroundMotion(delta);
  navigationController.updateMovement(delta, menuController.isOpen());
  applyCameraAmbientMotion(delta);
  renderSceneFrame(delta);
  diagnosticsState.frameAccumulator += delta;
  diagnosticsState.frameCounter += 1;
  if (diagnosticsState.frameAccumulator >= 0.25) {
    diagnosticsState.fps = diagnosticsState.frameCounter / diagnosticsState.frameAccumulator;
    diagnosticsState.frameMs = (diagnosticsState.frameAccumulator / diagnosticsState.frameCounter) * 1000;
    diagnosticsState.frameAccumulator = 0;
    diagnosticsState.frameCounter = 0;
    updatePerformanceDiagnostics();
  }
  viewerLifecycle.animationFrameId = window.requestAnimationFrame(animate);
}

navigationController.syncLookStateFromCamera();
applyViewportColorSettings();
applySelectiveBloomSettings();
syncPostProcessingSize();
applyCameraSettings();
applyCameraMotionSettings();
applyInterfaceSettings();
applyDebugModeSettings();
applyBackgroundColorSettings();
applyFireColorSettings();
applyReflectMaterialSettings();
sceneLayerLoader.loadSceneLayers();
viewerLifecycle.animationFrameId = window.requestAnimationFrame(animate);
} catch (error) {
  disposeOnInitFailure?.();
  renderInitializationError(error);
}

import "./style.css";

import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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
import { createSelectiveBloomPipeline } from "./postprocessing/createSelectiveBloomPipeline.js";
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
const searchParams = new URLSearchParams(window.location.search);
let debugMode = parseBooleanFlag(searchParams.get("debug")) ?? false;
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
  menuMode: debugMode ? "debug" : "viewer",
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
  loadingBarFill,
  helpFab,
  controlDock,
  menuToggleButton,
  menuToggleLabel,
  helpToggleButton,
  helpOverlay,
  helpCloseButton,
  menuCloseButton,
  hudPanel,
  quickExposureValue,
  quickCameraFovValue,
  quickCameraHeightValue,
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
const initialViewportWidth = viewport.clientWidth || window.innerWidth;
const initialViewportHeight = viewport.clientHeight || window.innerHeight;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(initialViewportWidth, initialViewportHeight);
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
  initialViewportWidth / initialViewportHeight,
  0.05,
  5000,
);
camera.up.set(0, 1, 0);
camera.position.set(0, 1.7, 4);

const clock = new THREE.Clock();
const BLOOM_SCENE_LAYER = VIEWER_CONFIG.postProcessing.selectiveBloom.layer;
const selectiveBloomConfig = {
  ...VIEWER_CONFIG.postProcessing.selectiveBloom,
};
const viewerLifecycle = {
  animationFrameId: null,
  disposed: false,
};
const selectiveBloomPipeline = createSelectiveBloomPipeline({
  renderer,
  scene,
  camera,
  bloomLayerId: BLOOM_SCENE_LAYER,
  width: initialViewportWidth,
  height: initialViewportHeight,
});

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

function parseNonNegativeInteger(value) {
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
    return parseNonNegativeInteger(window.localStorage.getItem("viewer.baseTextureMaxSize"));
  } catch {
    return null;
  }
}

const runtimeOptimizationState = {
  lowMemoryBaseMipmaps: parseBooleanFlag(searchParams.get("lowMemoryBase"))
    ?? getStoredLowMemoryBaseMode()
    ?? VIEWER_CONFIG.runtimeOptimization.lowMemoryBaseMipmaps,
  baseTextureMaxSize: parseNonNegativeInteger(searchParams.get("baseTextureCap"))
    ?? getStoredBaseTextureCap()
    ?? VIEWER_CONFIG.runtimeOptimization.baseTextureMaxSize,
};
const colorPipelineState = {
  toneMapping: VIEWER_CONFIG.colorPipeline.toneMapping,
  exposure: VIEWER_CONFIG.colorPipeline.exposure,
};
const interfaceState = {
  showCrosshair: VIEWER_CONFIG.interface.showCrosshair,
};
const cameraMotionState = {
  enabled: VIEWER_CONFIG.camera.ambientMotion.enabled,
};
const viewerConfig = {
  ...VIEWER_CONFIG,
  camera: {
    ...VIEWER_CONFIG.camera,
    ambientMotion: {
      ...VIEWER_CONFIG.camera.ambientMotion,
    },
  },
  colorPipeline: colorPipelineState,
  interface: interfaceState,
  locomotion: {
    ...VIEWER_CONFIG.locomotion,
  },
  postProcessing: {
    ...VIEWER_CONFIG.postProcessing,
  },
  runtimeOptimization: runtimeOptimizationState,
};
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
function setLoadingProgress(progress, { indeterminate = false } = {}) {
  if (!loadingBarFill) {
    return;
  }

  if (indeterminate) {
    loadingBarFill.classList.add("is-indeterminate");
    loadingBarFill.style.removeProperty("--loading-progress");
    return;
  }

  const normalizedProgress = Math.min(Math.max(progress, 0), 1);
  loadingBarFill.classList.remove("is-indeterminate");
  loadingBarFill.style.setProperty("--loading-progress", `${(normalizedProgress * 100).toFixed(1)}%`);
}

loadingManager.setURLModifier((url) => (
  shouldAppendAssetQuery(url)
    ? appendAssetQuery(url, assetQuery)
    : url
));
loadingManager.onStart = () => {
  setLoadingProgress(0, { indeterminate: true });
};
loadingManager.onProgress = (_url, itemsLoaded, itemsTotal) => {
  if (!itemsTotal) {
    setLoadingProgress(0, { indeterminate: true });
    return;
  }

  setLoadingProgress(itemsLoaded / itemsTotal);
};
loadingManager.onLoad = () => {
  setLoadingProgress(1);
};

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
const updateStatus = (message) => {
  statusLine.textContent = message;
  if (loadingStatusLine) {
    loadingStatusLine.textContent = message;
  }
};
const reflectionEnvironment = createReflectionEnvironmentManager({
  viewerConfig,
  searchParams,
  assetQuery,
  reflectionPmremGenerator,
  scene,
  textureLoader,
  updateStatus,
});
const materialPipeline = createMaterialPipeline({
  viewerConfig,
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
  runtimeOptimization: runtimeOptimizationState,
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
  viewerConfig,
  cameraMotionState,
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
  initialMode: debugMode ? "debug" : "viewer",
  isTouchDevice,
  navigationController,
  updateStatus,
});
const helpOverlayState = {
  isOpen: false,
  relockAfterClose: false,
};
const controlDockState = {
  hideTimeout: null,
};

// Show control dock and schedule auto-hide
function showDock() {
  if (!controlDock) return;
  controlDock.classList.add("is-visible");

  // Clear existing timeout
  if (controlDockState.hideTimeout) {
    clearTimeout(controlDockState.hideTimeout);
  }

  // Schedule hide after 3 seconds
  controlDockState.hideTimeout = setTimeout(() => {
    if (controlDock) {
      controlDock.classList.remove("is-visible");
    }
  }, 3000);
}

// Hide control dock immediately
function hideDock() {
  if (!controlDock) return;
  if (controlDockState.hideTimeout) {
    clearTimeout(controlDockState.hideTimeout);
    controlDockState.hideTimeout = null;
  }
  controlDock.classList.remove("is-visible");
}

if (baseLowMemoryToggle) {
  baseLowMemoryToggle.checked = runtimeOptimizationState.lowMemoryBaseMipmaps;
}

if (baseTextureCapSelect) {
  baseTextureCapSelect.value = `${runtimeOptimizationState.baseTextureMaxSize}`;
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

function setHelpOverlayOpen(nextOpen) {
  const normalizedOpen = Boolean(nextOpen);
  if (helpOverlayState.isOpen === normalizedOpen) {
    return;
  }

  helpOverlayState.isOpen = normalizedOpen;
  helpToggleButton?.setAttribute("aria-expanded", `${normalizedOpen}`);

  if (helpOverlay) {
    helpOverlay.hidden = !normalizedOpen;
  }

  viewport.classList.toggle("has-help-open", normalizedOpen);

  if (normalizedOpen) {
    helpOverlayState.relockAfterClose = navigationController.controls.isLocked && !isTouchDevice;
    navigationController.controls.unlock();
    navigationController.resetMovementInputs();
    updateStatus("Help open. Scene controls are paused.");
    return;
  }

  if (helpOverlayState.relockAfterClose && !isTouchDevice && !menuController.isOpen()) {
    requestAnimationFrame(() => {
      navigationController.controls.lock({ ignoreCooldown: true });
    });
  }
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
  const toneMappingKey = colorPipelineState.toneMapping in toneMappingModes
    ? colorPipelineState.toneMapping
    : "standard";
  renderer.toneMapping = toneMappingModes[toneMappingKey];
  renderer.toneMappingExposure = colorPipelineState.exposure;

  if (toneMappingSelect) {
    toneMappingSelect.value = toneMappingKey;
  }

  if (exposureSlider) {
    exposureSlider.value = colorPipelineState.exposure.toFixed(2);
  }

  if (exposureValue) {
    exposureValue.value = colorPipelineState.exposure.toFixed(2);
    exposureValue.textContent = colorPipelineState.exposure.toFixed(2);
  }

  if (quickExposureValue) {
    quickExposureValue.textContent = colorPipelineState.exposure.toFixed(2);
  }
}

function applySelectiveBloomSettings() {
  selectiveBloomPipeline.applySettings(selectiveBloomConfig);

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
  const width = viewport.clientWidth || window.innerWidth;
  const height = viewport.clientHeight || window.innerHeight;
  selectiveBloomPipeline.syncSize(width, height, pixelRatio);
}

function renderSceneFrame(delta) {
  selectiveBloomPipeline.render(delta, selectiveBloomConfig);
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

  if (quickCameraFovValue) {
    quickCameraFovValue.textContent = `${navigationController.cameraState.fov.toFixed(0)} deg`;
  }

  if (quickCameraHeightValue) {
    quickCameraHeightValue.textContent = navigationController.cameraState.height.toFixed(2);
  }
}

function applyCameraMotionSettings() {
  if (cameraShakeToggle) {
    cameraShakeToggle.checked = cameraMotionState.enabled;
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
    showCrosshairToggle.checked = interfaceState.showCrosshair;
  }

  if (isTouchDevice) {
    crosshair.style.display = "none";
    return;
  }

  crosshair.style.display = interfaceState.showCrosshair ? "" : "none";
}

function applyDebugModeSettings() {
  const menuMode = debugMode ? "debug" : "viewer";
  hud.classList.toggle("is-debug-mode", debugMode);
  menuController.setMode(menuMode);

  if (menuToggleLabel) {
    menuToggleLabel.textContent = debugMode ? "Debug Menu" : "Controls";
  }

  const menuKicker = hudPanel?.querySelector(".panel-kicker");
  if (menuKicker) {
    menuKicker.textContent = debugMode ? "Debug Controls" : "Viewer Controls";
  }

  const menuTitle = hudPanel?.querySelector("h1");
  if (menuTitle) {
    menuTitle.textContent = debugMode
      ? "Tune the scene without losing flow"
      : "Keep the scene readable and easy to tune";
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

function nudgeCameraHeight(delta) {
  const nextHeight = THREE.MathUtils.clamp(
    navigationController.cameraState.height + delta,
    0.5,
    2.5,
  );

  if (nextHeight === navigationController.cameraState.height) {
    return;
  }

  navigationController.cameraState.height = nextHeight;
  applyCameraSettings();
  showDock();
  updateStatus(`Camera height set to ${nextHeight.toFixed(2)}.`);
}

function nudgeCameraFov(delta) {
  const nextFov = THREE.MathUtils.clamp(
    navigationController.cameraState.fov + delta,
    30,
    110,
  );

  if (nextFov === navigationController.cameraState.fov) {
    return;
  }

  navigationController.cameraState.fov = nextFov;
  applyCameraSettings();
  showDock();
  updateStatus(`Camera FOV set to ${nextFov.toFixed(0)} deg.`);
}

function applyRuntimeTextureOptimizations() {
  materialPipeline.applyRuntimeTextureOptimizations(diagnosticsState.loadedLayers);
  updatePerformanceDiagnostics();
}

function setBaseLowMemoryMode(enabled) {
  runtimeOptimizationState.lowMemoryBaseMipmaps = enabled;

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
  runtimeOptimizationState.baseTextureMaxSize = cap;

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
  viewerConfig,
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
    selectiveBloomPipeline.syncTargets(loadedLayers, selectiveBloomConfig);
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
const handlePostProcessingResize = () => {
  syncPostProcessingSize();
};
const unbindNavigationEvents = navigationController.bindInputEvents({
  getMenuOpen: () => menuController.isOpen() || helpOverlayState.isOpen,
  onToggleMenu: () => {
    if (helpOverlayState.isOpen) {
      setHelpOverlayOpen(false);
    }

    menuController.setOpen(!menuController.isOpen());
  },
  onToggleHelp: () => setHelpOverlayOpen(!helpOverlayState.isOpen),
  onCloseMenu: () => {
    if (helpOverlayState.isOpen) {
      setHelpOverlayOpen(false);
      return;
    }

    menuController.setOpen(false);
  },
  onAdjustCameraHeight: (delta) => {
    nudgeCameraHeight(delta);
  },
  onAdjustCameraFov: (delta) => {
    nudgeCameraFov(delta);
  },
  onResumeFireVideo: () => sceneLayerLoader.resumeFireVideoPlayback(),
  onMoveStart: () => hideDock(),
});
window.addEventListener("resize", handlePostProcessingResize);
const unbindDebugUi = debugObjectInspector.bindUi();
const unbindViewerUi = bindViewerUiEvents({
  refs,
  onToneMappingChange: (value) => {
    colorPipelineState.toneMapping = value;
    applyViewportColorSettings();
  },
  onExposureChange: (value) => {
    colorPipelineState.exposure = value;
    applyViewportColorSettings();
    showDock();
  },
  onSelectiveBloomStrengthChange: (value) => {
    selectiveBloomConfig.strength = value;
    applySelectiveBloomSettings();
  },
  onCameraFovChange: (value) => {
    navigationController.cameraState.fov = value;
    applyCameraSettings();
    showDock();
  },
  onCameraHeightChange: (value) => {
    navigationController.cameraState.height = value;
    applyCameraSettings();
    showDock();
  },
  onShowCrosshairChange: (checked) => {
    interfaceState.showCrosshair = checked;
    applyInterfaceSettings();
  },
  onCameraShakeChange: (checked) => {
    cameraMotionState.enabled = checked;
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
    setBaseTextureCap(parseNonNegativeInteger(value) ?? 0);
  },
  onMenuToggle: () => {
    if (helpOverlayState.isOpen) {
      setHelpOverlayOpen(false);
    }
    showDock();
    menuController.setOpen(!menuController.isOpen());
  },
  onHelpToggle: () => {
    setHelpOverlayOpen(!helpOverlayState.isOpen);
    showDock();
  },
  onHelpClose: () => {
    setHelpOverlayOpen(false);
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

function disposeViewerResources() {
  if (viewerLifecycle.disposed) {
    return;
  }

  viewerLifecycle.disposed = true;
  if (viewerLifecycle.animationFrameId !== null) {
    window.cancelAnimationFrame(viewerLifecycle.animationFrameId);
    viewerLifecycle.animationFrameId = null;
  }

  unbindViewerUi?.();
  unbindDebugUi?.();
  unbindNavigationEvents?.();
  menuController.dispose?.();
  setHelpOverlayOpen(false);
  window.removeEventListener("resize", handlePostProcessingResize);
  debugObjectInspector.dispose?.();
  sceneLayerLoader.dispose();
  clearFallbackScene();
  reflectionEnvironment.dispose();
  selectiveBloomPipeline.dispose();
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

debugObjectInspector.setEnabled(debugMode);

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

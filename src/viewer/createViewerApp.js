import {
  BoxGeometry,
  Clock,
  Color,
  GridHelper,
  Group,
  LoadingManager,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  TextureLoader,
  WebGLRenderer
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createAmbientAudioController } from "../audio/createAmbientAudioController.js";
import {
  getMissingSceneStatusMessage,
  LOADING_BACKGROUND_URL,
  RENDERS_BASE_URL,
  SCENE_LOAD_STATUS_HTML,
  VIEWER_CONFIG,
} from "../config/viewerConfig.js";
import { appendAssetQuery, resolveAssetContract } from "../loaders/assetResolver.js";
import { createNavigationController } from "../camera/navigationController.js";
import { createDebugObjectInspector } from "../debug/debugObjectInspector.js";
import {
  applyMaterialSettingsDocumentToState,
  createMaterialSettingsDocumentFromState,
  normalizeMaterialSettingsDocument,
} from "../debug/materialSettingsStore.js";
import { createPerformanceDiagnostics } from "../diagnostics/performanceDiagnostics.js";
import { createSceneLayerLoader } from "../loaders/sceneLayerLoader.js";
import { createMaterialPipeline } from "../materials/materialPipeline.js";
import { createProbeEnvironmentManager } from "../materials/probeEnvironmentManager.js";
import { createReflectionEnvironmentManager } from "../materials/reflectionEnvironment.js";
import { createSelectiveBloomPipeline } from "../postprocessing/createSelectiveBloomPipeline.js";
import { bindViewerUiEvents } from "../ui/debugPanelBindings.js";
import { createGalleryOverlay } from "../ui/galleryOverlay.js";
import { createMenuController } from "../ui/menuController.js";
import { createViewerShell } from "../ui/createViewerShell.js";
import { createDebugInspectorUi } from "../ui/viewerDomRefs.js";
import { disposeObjectTree } from "../utils/threeDisposal.js";
import { createLayerControls } from "./createLayerControls.js";
import { createViewerLifecycle } from "./createViewerLifecycle.js";
import { createViewerState } from "./createViewerState.js";
import { createViewerUiController } from "./createViewerUiController.js";

export function createViewerApp({ app: providedApp } = {}) {
  let runtime = null;

  async function init() {
    if (runtime) {
      return;
    }

    runtime = createComposedViewerRuntime({
      app: providedApp ?? document.querySelector("#app"),
    });

    try {
      await runtime.init();
    } catch (error) {
      runtime.dispose?.();
      runtime = null;
      throw error;
    }
  }

  function dispose() {
    runtime?.dispose();
    runtime = null;
  }

  return {
    init,
    dispose,
  };
}

function createComposedViewerRuntime({ app }) {
  if (!app) {
    throw new Error('Viewer root "#app" was not found.');
  }

const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
const isWalkMode = VIEWER_CONFIG.locomotion.mode === "walk";
const searchParams = new URLSearchParams(window.location.search);
let debugMode = parseBooleanFlag(searchParams.get("debug")) ?? false;
const renderScaleQueryValue = Number.parseFloat(searchParams.get("renderScale") ?? "");
const initialRenderScale = (
  Number.isFinite(renderScaleQueryValue)
  && renderScaleQueryValue >= 0.2
  && renderScaleQueryValue <= 1.0
)
  ? renderScaleQueryValue
  : detectInitialRenderScale();

const {
  nodes: {
    viewport,
    hud,
    loadingScreen,
    crosshair,
    mobileControls,
  },
  refs,
} = createViewerShell({
  app,
  isTouchDevice,
  isWalkMode,
  menuMode: debugMode ? "debug" : "viewer",
  viewerConfig: VIEWER_CONFIG,
  sceneLoadStatusHtml: SCENE_LOAD_STATUS_HTML,
  loadingBackgroundUrl: LOADING_BACKGROUND_URL,
});

// Set dock animation durations from config
viewport.style.setProperty("--dock-fade-in-duration", `${VIEWER_CONFIG.interface.dock.fadeInDuration}ms`);
viewport.style.setProperty("--dock-fade-out-duration", `${VIEWER_CONFIG.interface.dock.fadeOutDuration}ms`);
viewport.style.setProperty("--dock-auto-hide-delay", `${VIEWER_CONFIG.interface.dock.autoHideDelay}ms`);

const {
  statusLine,
  loadingStatusLine,
  loadingBarFill,
  helpFab,
  controlDock,
  menuToggleButton,
  helpToggleButton,
  helpOverlay,
  helpCloseButton,
  bottomDock: bottomDockRef,
  bottomDockCategories: bottomDockCategoriesRef,
  bottomDockDebugIndicator,
  bottomHelpToggleButton,
  leftSidebar: leftSidebarRef,
  sidebarTitle: sidebarTitleRef,
  quickFpsValue,
  quickCameraFovValue,
  quickCameraHeightValue,
  bottomQuickFpsValue,
  bottomQuickCameraFovValue,
  bottomQuickCameraHeightValue,
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
  backgroundGammaSlider,
  backgroundGammaValue,
  skyHueSlider,
  skyHueValue,
  skySaturationSlider,
  skySaturationValue,
  skyValueSlider,
  skyValueOutput,
  skyGammaSlider,
  skyGammaValue,
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
  reflectEnvRotationYSlider,
  reflectEnvRotationYValue,
  layerControls,
  statFps,
  statFrameMs,
  statDrawCalls,
  statTriangles,
  statTextures,
  statTextureMemory,
  baseLowMemoryToggle,
  renderScaleSlider,
  renderScaleValue,
  galleryOverlay: galleryOverlayRef,
  joystickBase,
  joystickThumb,
  lookPad,
  flyUpButton,
  flyDownButton,
  boostButton,
} = refs;

const BLOOM_SCENE_LAYER = VIEWER_CONFIG.postProcessing.selectiveBloom.layer;
const selectiveBloomConfig = {
  ...VIEWER_CONFIG.postProcessing.selectiveBloom,
};

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

function isLikelyLowEndBloomDevice() {
  const deviceMemory = typeof navigator.deviceMemory === "number"
    ? navigator.deviceMemory
    : null;
  const hardwareConcurrency = typeof navigator.hardwareConcurrency === "number"
    ? navigator.hardwareConcurrency
    : null;
  const isMac = /Macintosh|MacIntel/i.test(navigator.userAgent);
  const isMobile = window.matchMedia("(pointer: coarse)").matches
    || "ontouchstart" in window;

  if (isMobile) {
    return true;
  }

  if (isMac && hardwareConcurrency !== null && hardwareConcurrency <= 8) {
    return true;
  }

  if (
    deviceMemory !== null
    && deviceMemory <= selectiveBloomConfig.lowEndDeviceMemoryGb
    && hardwareConcurrency !== null
    && hardwareConcurrency <= 8
  ) {
    return true;
  }

  if (hardwareConcurrency !== null && hardwareConcurrency <= selectiveBloomConfig.lowEndHardwareConcurrency) {
    return true;
  }

  return false;
}

const bloomQueryValue = parseBooleanFlag(
  searchParams.get("bloom") ?? searchParams.get("selectiveBloom"),
);
if (bloomQueryValue !== null) {
  selectiveBloomConfig.enabled = bloomQueryValue;
} else if (selectiveBloomConfig.autoDisableOnLowEndDevices && isLikelyLowEndBloomDevice()) {
  selectiveBloomConfig.enabled = false;
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
const state = createViewerState({
  baseViewerConfig: VIEWER_CONFIG,
  initialRuntimeOptimizationState: {
    lowMemoryBaseMipmaps: parseBooleanFlag(searchParams.get("lowMemoryBase"))
      ?? getStoredLowMemoryBaseMode()
      ?? VIEWER_CONFIG.runtimeOptimization.lowMemoryBaseMipmaps,
    baseTextureMaxSize: 0,
    renderScale: initialRenderScale,
  },
});
const {
  runtimeOptimizationState,
  colorPipelineState,
  interfaceState,
  cameraMotionState,
  ambientAudioState,
  viewerConfig,
  diagnosticsState,
  backgroundState,
  skyState,
  fireState,
  reflectionState,
  viewerLifecycle,
  helpOverlayState,
  controlDockState,
} = state;

function getEffectivePixelRatio() {
  return Math.min(window.devicePixelRatio, 2) * runtimeOptimizationState.renderScale;
}

const useAntialias = initialRenderScale >= 1.0 && !selectiveBloomConfig.enabled;
const renderer = new WebGLRenderer({ antialias: useAntialias });
const initialViewportWidth = viewport.clientWidth || window.innerWidth;
const initialViewportHeight = viewport.clientHeight || window.innerHeight;
renderer.setPixelRatio(getEffectivePixelRatio());
renderer.setSize(initialViewportWidth, initialViewportHeight);
renderer.outputColorSpace = SRGBColorSpace;
renderer.shadowMap.enabled = false;
renderer.transmissionResolutionScale = initialRenderScale < 0.75 ? 0.25 : 0.5;
viewport.prepend(renderer.domElement);
const maxSupportedAnisotropy = renderer.capabilities.getMaxAnisotropy();

const scene = new Scene();
scene.background = new Color("#050816");
const reflectionPmremGenerator = new PMREMGenerator(renderer);
reflectionPmremGenerator.compileCubemapShader();
const probeEnvironmentManager = createProbeEnvironmentManager({ pmremGenerator: reflectionPmremGenerator });
const sceneRoots = new Group();
scene.add(sceneRoots);

const camera = new PerspectiveCamera(
  VIEWER_CONFIG.camera.fov,
  initialViewportWidth / initialViewportHeight,
  0.1,
  500,
);
camera.up.set(0, 1, 0);
camera.position.set(0, 1.7, 4);

const clock = new Clock();
const selectiveBloomPipeline = createSelectiveBloomPipeline({
  renderer,
  scene,
  camera,
  bloomLayerId: BLOOM_SCENE_LAYER,
  width: initialViewportWidth,
  height: initialViewportHeight,
});
const assetBustValue = searchParams.get("assetBust");
const isLocalAssetDevelopment = import.meta.env.DEV
  || ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
const assetQuery = debugMode
  ? `v=${encodeURIComponent(assetBustValue || `${Date.now()}`)}`
  : (assetBustValue
      ? `v=${encodeURIComponent(assetBustValue)}`
      : (isLocalAssetDevelopment ? `v=${encodeURIComponent(`${Date.now()}`)}` : ""));
const materialSettingsPersistenceState = {
  hasLoaded: false,
  lastSerialized: "",
  saveTimeoutId: null,
};

try {
  window.localStorage.removeItem("viewer.debugMode");
  window.localStorage.removeItem("viewer.baseTextureMaxSize");
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

const ambientAudioUrl = resolveAssetContract(
  VIEWER_CONFIG.assets.ambientAudio,
  searchParams,
  assetQuery,
)?.url;
const ambientAudioController = ambientAudioUrl
  ? createAmbientAudioController({
    src: ambientAudioUrl,
    initialVolume: ambientAudioState.volume,
    fadeInDurationMs: VIEWER_CONFIG.audio.ambient.fadeInDurationMs,
    loop: VIEWER_CONFIG.audio.ambient.loop,
  })
  : null;

const loadingManager = new LoadingManager();
const smoothProgressState = {
  target: 0,
  current: 0,
  rafId: null,
  lastTime: 0,
  finished: false,
};

function setLoadingProgress(progress, { indeterminate = false } = {}) {
  if (!loadingBarFill) {
    return;
  }

  if (indeterminate) {
    smoothProgressState.target = 0;
    smoothProgressState.current = 0;
    smoothProgressState.finished = false;
    loadingBarFill.classList.add("is-indeterminate");
    loadingBarFill.style.removeProperty("--loading-progress");
    return;
  }

  const normalizedProgress = Math.min(Math.max(progress, 0), 1);
  smoothProgressState.target = normalizedProgress;
  smoothProgressState.finished = normalizedProgress >= 1;
  loadingBarFill.classList.remove("is-indeterminate");

  if (!smoothProgressState.rafId) {
    smoothProgressState.lastTime = performance.now();
    smoothProgressState.rafId = requestAnimationFrame(tickSmoothProgress);
  }
}

function tickSmoothProgress(timestamp) {
  const dt = Math.min((timestamp - smoothProgressState.lastTime) / 1000, 0.1);
  smoothProgressState.lastTime = timestamp;

  const remaining = smoothProgressState.target - smoothProgressState.current;
  if (remaining < 0.0005 && smoothProgressState.finished) {
    smoothProgressState.current = smoothProgressState.target;
    applySmoothProgress();
    smoothProgressState.rafId = null;
    return;
  }

  const speed = smoothProgressState.finished
    ? 6
    : 2.5;
  smoothProgressState.current += remaining * (1 - Math.exp(-speed * dt));
  smoothProgressState.current = Math.min(smoothProgressState.current, smoothProgressState.target);
  applySmoothProgress();

  smoothProgressState.rafId = requestAnimationFrame(tickSmoothProgress);
}

function applySmoothProgress() {
  if (!loadingBarFill) return;
  loadingBarFill.style.setProperty(
    "--loading-progress",
    `${(smoothProgressState.current * 100).toFixed(2)}%`,
  );
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
const textureLoader = new TextureLoader(loadingManager);
const fallbackSceneRoots = [];
const updateStatus = (message) => {
  statusLine.textContent = message;
  if (loadingStatusLine) {
    loadingStatusLine.textContent = message;
  }
};

function getMaterialSettingsUrl() {
  const suffix = assetQuery ? `?${assetQuery}` : "";
  return `/material-settings.json${suffix}`;
}

async function loadMaterialSettings() {
  const fallbackDocument = normalizeMaterialSettingsDocument(null, viewerConfig);

  try {
    const response = await fetch(getMaterialSettingsUrl(), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Material settings load failed with ${response.status}.`);
    }

    const documentValue = normalizeMaterialSettingsDocument(await response.json(), viewerConfig);
    applyMaterialSettingsDocumentToState(documentValue, {
      backgroundState,
      skyState,
      reflectionState,
    });
    materialSettingsPersistenceState.lastSerialized = JSON.stringify(documentValue);
    materialSettingsPersistenceState.hasLoaded = true;
  } catch (error) {
    console.warn("Material settings file could not be loaded, using current defaults.", error);
    applyMaterialSettingsDocumentToState(fallbackDocument, {
      backgroundState,
      skyState,
      reflectionState,
    });
    materialSettingsPersistenceState.lastSerialized = JSON.stringify(fallbackDocument);
    materialSettingsPersistenceState.hasLoaded = true;
  }
}

async function saveMaterialSettings() {
  if (!import.meta.env.DEV || !materialSettingsPersistenceState.hasLoaded) {
    return;
  }

  const documentValue = normalizeMaterialSettingsDocument(
    createMaterialSettingsDocumentFromState({
      backgroundState,
      skyState,
      reflectionState,
    }),
    viewerConfig,
  );
  const serialized = JSON.stringify(documentValue);
  if (serialized === materialSettingsPersistenceState.lastSerialized) {
    return;
  }

  try {
    const response = await fetch("/__debug/material-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: `${JSON.stringify(documentValue, null, 2)}\n`,
    });

    if (!response.ok) {
      throw new Error(`Material settings save failed with ${response.status}.`);
    }

    materialSettingsPersistenceState.lastSerialized = serialized;
  } catch (error) {
    console.warn("Material settings could not be saved.", error);
  }
}

function scheduleMaterialSettingsSave() {
  if (!import.meta.env.DEV || !materialSettingsPersistenceState.hasLoaded) {
    return;
  }

  if (materialSettingsPersistenceState.saveTimeoutId) {
    clearTimeout(materialSettingsPersistenceState.saveTimeoutId);
  }

  materialSettingsPersistenceState.saveTimeoutId = window.setTimeout(() => {
    materialSettingsPersistenceState.saveTimeoutId = null;
    saveMaterialSettings();
  }, 180);
}
const reflectionEnvironment = createReflectionEnvironmentManager({
  reflectionPmremGenerator,
  scene,
});
reflectionEnvironment.setProbeEnvironmentManager(probeEnvironmentManager);
const materialPipeline = createMaterialPipeline({
  viewerConfig,
  maxSupportedAnisotropy,
  backgroundState,
  skyState,
  fireState,
  reflectionState,
  reflectionEnvironment,
});
const performanceDiagnostics = createPerformanceDiagnostics({
  enabled: true,
  diagnosticsState,
  statsElements: {
    quickFpsValue,
    bottomQuickFpsValue,
    statFps,
    statFrameMs,
    statDrawCalls,
    statTriangles,
    statTextures,
    statTextureMemory,
  },
  getTextureDimensions: materialPipeline.getTextureDimensions,
  getHeavyStatsEnabled: () => debugMode,
  getRendererInfo: () => renderer.info,
});
const updatePerformanceDiagnostics = () => {
  performanceDiagnostics.update();
};
let viewerLifecycleController = null;
let debugObjectInspector = null;
const requestSceneRender = () => {
  viewerLifecycleController?.requestRender();
};
const getDocumentHasFocus = () => (
  typeof document.hasFocus === "function"
    ? document.hasFocus()
    : true
);
const getRenderMode = () => {
  if (document.hidden || !getDocumentHasFocus()) {
    return "background";
  }

  if (helpOverlayState.isOpen || galleryOverlay.isOpen()) {
    return "paused";
  }

  if (menuController.isOpen() && !debugObjectInspector?.isPickerArmed?.()) {
    return "paused";
  }

  return "active";
};
const syncViewerRenderMode = () => {
  viewerLifecycleController?.syncRenderMode();
};
const syncObjectPickerContext = ({
  activeCategoryId = null,
  isOpen = false,
  isSidebarOpen = false,
  mode = "viewer",
} = {}) => {
  debugObjectInspector?.setPickerContextActive(
    mode === "debug"
      && isOpen
      && isSidebarOpen
      && activeCategoryId === "objects",
  );
  syncViewerRenderMode();
  requestSceneRender();
};
debugObjectInspector = createDebugObjectInspector({
  enabled: debugMode,
  isDev: import.meta.env.DEV,
  assetQuery,
  camera,
  sceneRoots,
  rendererDomElement: renderer.domElement,
  materialPipeline,
  updateStatus,
  getMenuOpen: () => menuController.isOpen(),
  onPickerArmedChange: () => {
    syncViewerRenderMode();
    requestSceneRender();
  },
  requestRender: requestSceneRender,
  ui: createDebugInspectorUi(refs),
});
const navigationController = createNavigationController({
  camera,
  renderer,
  getEffectivePixelRatio,
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
navigationController.setCollisionRoots([]);
const menuController = createMenuController({
  viewport,
  hud,
  menuToggleButton,
  bottomDock: bottomDockRef,
  bottomDockCategories: bottomDockCategoriesRef,
  leftSidebar: leftSidebarRef,
  sidebarTitle: sidebarTitleRef,
  initialMode: debugMode ? "debug" : "viewer",
  isTouchDevice,
  navigationController,
  updateStatus,
  onDebugToggleRequest: () => {
    setDebugMode(!debugMode);
  },
  onGalleryToggle: () => {
    openGallery();
  },
  onStateChange: syncObjectPickerContext,
});
const galleryOverlay = createGalleryOverlay({
  overlay: galleryOverlayRef,
  rendersBaseUrl: RENDERS_BASE_URL,
});
galleryOverlay.setOnClose(() => {
  syncViewerRenderMode();
  requestSceneRender();
});
const layerControlsRenderer = createLayerControls({
  container: layerControls,
  diagnosticsState,
  getDebugMode: () => debugMode,
  requestRender: requestSceneRender,
  updatePerformanceDiagnostics,
  updateStatus,
});
const uiController = createViewerUiController({
  refs,
  nodes: {
    viewport,
    hud,
    crosshair,
  },
  state: {
    colorPipelineState,
    interfaceState,
    cameraMotionState,
    ambientAudioState,
    runtimeOptimizationState,
    backgroundState,
    skyState,
    fireState,
    reflectionState,
  },
  viewerConfig,
  materialPipeline,
  renderer,
  selectiveBloomConfig,
  selectiveBloomPipeline,
  getEffectivePixelRatio,
  navigationController,
  menuController,
  getDebugMode: () => debugMode,
  isTouchDevice,
  ambientAudioController,
});

// Show control dock and schedule auto-hide
function showDock() {
  if (!controlDock) return;
  controlDock.classList.add("is-visible");

  if (controlDockState.hideTimeout) {
    clearTimeout(controlDockState.hideTimeout);
  }

  const hideDelay = VIEWER_CONFIG.interface.dock.autoHideDelay;
  controlDockState.hideTimeout = setTimeout(() => {
    if (controlDock && !menuController.isOpen() && !helpOverlayState.isOpen) {
      controlDock.classList.remove("is-visible");
    }
  }, hideDelay);
}

function hideDock() {
  if (!controlDock) return;
  if (menuController.isOpen() || helpOverlayState.isOpen) {
    controlDock.classList.add("is-visible");
    return;
  }
  if (controlDockState.hideTimeout) {
    clearTimeout(controlDockState.hideTimeout);
    controlDockState.hideTimeout = null;
  }
  controlDock.classList.remove("is-visible");
}

if (baseLowMemoryToggle) {
  baseLowMemoryToggle.checked = runtimeOptimizationState.lowMemoryBaseMipmaps;
}

if (renderScaleSlider) {
  renderScaleSlider.value = runtimeOptimizationState.renderScale.toFixed(2);
}

if (renderScaleValue) {
  renderScaleValue.textContent = runtimeOptimizationState.renderScale.toFixed(2);
}

function setHelpOverlayOpen(nextOpen) {
  const normalizedOpen = Boolean(nextOpen);
  if (helpOverlayState.isOpen === normalizedOpen) {
    return;
  }

  helpOverlayState.isOpen = normalizedOpen;
  helpToggleButton?.setAttribute("aria-expanded", `${normalizedOpen}`);
  bottomHelpToggleButton?.setAttribute("aria-expanded", `${normalizedOpen}`);

  if (helpOverlay) {
    helpOverlay.hidden = !normalizedOpen;
  }

  viewport.classList.toggle("has-help-open", normalizedOpen);

  if (normalizedOpen) {
    helpOverlayState.relockAfterClose = navigationController.controls.isLocked && !isTouchDevice;
    navigationController.controls.unlock();
    navigationController.resetMovementInputs();
    updateStatus("Help open. Scene controls are paused.");
    syncViewerRenderMode();
    requestSceneRender();
    return;
  }

  syncViewerRenderMode();
  requestSceneRender();
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
  }, 650);
}

function renderSceneFrame(delta) {
  selectiveBloomPipeline.render(delta, selectiveBloomConfig);
}

function setMenuOpen(nextOpen) {
  menuController.setOpen(nextOpen);
  syncViewerRenderMode();
  requestSceneRender();
}

function openGallery() {
  galleryOverlay.open();
  syncViewerRenderMode();
  requestSceneRender();
}

function closeGallery() {
  galleryOverlay.close();
  syncViewerRenderMode();
  requestSceneRender();
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

  debugObjectInspector.setEnabled(debugMode);
  uiController.applyDebugModeSettings();
  layerControlsRenderer.render();
  updatePerformanceDiagnostics();
  requestSceneRender();
  updateStatus(debugMode
    ? "Debug mode enabled. Scene stayed live; advanced tools are now available."
    : "Debug mode disabled. Scene stayed live; advanced tools are hidden.");
}

function nudgeCameraHeight(delta) {
  const nextHeight = MathUtils.clamp(
    navigationController.cameraState.height + delta,
    0.5,
    2.5,
  );

  if (nextHeight === navigationController.cameraState.height) {
    return;
  }

  navigationController.cameraState.height = nextHeight;
  uiController.applyCameraSettings();
  showDock();
  updateStatus(`Camera height set to ${nextHeight.toFixed(2)}.`);
}

function nudgeCameraFov(delta) {
  const nextFov = MathUtils.clamp(
    navigationController.cameraState.fov + delta,
    30,
    110,
  );

  if (nextFov === navigationController.cameraState.fov) {
    return;
  }

  navigationController.cameraState.fov = nextFov;
  uiController.applyCameraSettings();
  showDock();
  updateStatus(`Camera FOV set to ${nextFov.toFixed(0)}°.`);
}

function applyRuntimeTextureOptimizations() {
  materialPipeline.applyRuntimeTextureOptimizations(diagnosticsState.loadedLayers);
  updatePerformanceDiagnostics();
  requestSceneRender();
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
  requestSceneRender();
  updateStatus(`Low-memory base textures ${enabled ? "enabled" : "disabled"}.`);
}

function setRenderScale(nextScale) {
  const clampedScale = Math.min(1, Math.max(0.2, nextScale));
  runtimeOptimizationState.renderScale = clampedScale;
  uiController.syncRenderScaleReadouts(clampedScale);
  renderer.setPixelRatio(getEffectivePixelRatio());
  navigationController.handleResize();
  uiController.syncPostProcessingSize();
  requestSceneRender();
  updateStatus(`Render scale set to ${clampedScale.toFixed(2)}.`);
}

function positionCameraAtSpawn(root, loadedLayers = []) {
  const startMarker = loadedLayers
    .map((entry) => entry.root?.getObjectByName?.("Start"))
    .find(Boolean);

  if (startMarker) {
    navigationController.positionCameraAtMarker(startMarker);
    return;
  }

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

  const grid = new GridHelper(24, 24, 0x93c5fd, 0x334155);
  grid.position.y = -0.001;
  scene.add(grid);
  fallbackSceneRoots.push(grid);

  const room = new Group();
  const wallMaterial = new MeshBasicMaterial({ color: "#1e293b", wireframe: true });
  const roomMesh = new Mesh(new BoxGeometry(8, 4, 8), wallMaterial);
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
  ensureReflectionEnvironment: () => reflectionEnvironment.ensureFallbackEnvironment(),
  convertMeshForLayer: materialPipeline.convertMeshForLayer,
  matchesFireVideoTarget: materialPipeline.matchesFireVideoTarget,
  getFallbackTextureChannel: materialPipeline.getFallbackTextureChannel,
  applyTextureChannelOverride: materialPipeline.applyTextureChannelOverride,
  applyFireVideoMaterialPatch: materialPipeline.applyFireVideoMaterialPatch,
  updateStatus,
  addFallbackScene,
  renderLayerControls: () => layerControlsRenderer.render(),
  clearFallbackScene,
  applyBackgroundColorSettings: uiController.applyBackgroundColorSettings,
  applySkyColorSettings: uiController.applySkyColorSettings,
  applyFireColorSettings: uiController.applyFireColorSettings,
  applyReflectMaterialSettings: uiController.applyReflectMaterialSettings,
  applyRuntimeTextureOptimizations,
  updatePerformanceDiagnostics,
  positionCameraAtSpawn,
  applyCameraSettings: uiController.applyCameraSettings,
  setLoadingScreenVisible,
  onLayersLoaded: (loadedLayers) => {
    selectiveBloomPipeline.syncTargets(loadedLayers, selectiveBloomConfig);
    debugObjectInspector.setLoadedLayers(loadedLayers);
    navigationController.setCollisionRoots(
      loadedLayers
        .filter((entry) => entry.layer.runtime?.registerAsCollisionRoot)
        .map((entry) => entry.root),
    );
    requestSceneRender();
  },
  isTouchDevice,
  isWalkMode,
  trackedMaterialSets: [
    backgroundState.materials,
    skyState.materials,
    fireState.materials,
    reflectionState.materials,
  ],
  probeEnvironmentManager,
  setTranslucencySunDirection: materialPipeline.setTranslucencySunDirection,
});
const unbindNavigationEvents = navigationController.bindInputEvents({
  getMenuOpen: () => menuController.isOpen() || helpOverlayState.isOpen || galleryOverlay.isOpen(),
  getMenuMovementAllowed: () => menuController.isOpen() && debugObjectInspector.isPickerArmed(),
  onToggleMenu: () => {
    if (galleryOverlay.isOpen()) {
      closeGallery();
      return;
    }

    if (helpOverlayState.isOpen) {
      setHelpOverlayOpen(false);
    }

    showDock();
    setMenuOpen(!menuController.isOpen());
  },
  onToggleHelp: () => {
    if (galleryOverlay.isOpen()) {
      closeGallery();
      return;
    }

    setHelpOverlayOpen(!helpOverlayState.isOpen);
  },
  onCloseMenu: () => {
    if (galleryOverlay.isOpen()) {
      closeGallery();
      return;
    }

    if (helpOverlayState.isOpen) {
      setHelpOverlayOpen(false);
      return;
    }

    setMenuOpen(false);
  },
  onCameraHeightChanged: (height) => {
    uiController.syncCameraHeightReadouts(height);
    showDock();
  },
  onCameraFovChanged: (fov) => {
    uiController.syncCameraFovReadouts(fov);
  },
  onShowDock: () => {
    // ????????? dock ??? ??????? ??????????? FOV ???????
    showDock();
  },
  onResumeFireVideo: () => sceneLayerLoader.resumeFireVideoPlayback(),
  onMoveStart: () => {
    if (menuController.isOpen() && debugObjectInspector.isPickerArmed()) {
      return;
    }

    if (VIEWER_CONFIG.interface.dock.hideOnMovement) {
      hideDock();
    }
  },
});
const unbindDebugUi = debugObjectInspector.bindUi();
const unbindViewerUi = bindViewerUiEvents({
  refs,
  onExposureChange: (value) => {
    colorPipelineState.exposure = value;
    uiController.applyViewportColorSettings();
    requestSceneRender();
    showDock();
  },
  onSelectiveBloomStrengthChange: (value) => {
    selectiveBloomConfig.strength = value;
    uiController.applySelectiveBloomSettings();
    requestSceneRender();
  },
  onCameraFovChange: (value) => {
    navigationController.cameraState.fov = value;
    uiController.applyCameraSettings();
    requestSceneRender();
    showDock();
  },
  onCameraHeightChange: (value) => {
    navigationController.cameraState.height = value;
    uiController.applyCameraSettings();
    requestSceneRender();
    showDock();
  },
  onAmbientAudioVolumeChange: (value) => {
    ambientAudioState.volume = value;
    uiController.applyAmbientAudioSettings();
    showDock();
  },
  onShowCrosshairChange: (checked) => {
    interfaceState.showCrosshair = checked;
    uiController.applyInterfaceSettings();
    requestSceneRender();
  },
  onCameraShakeChange: (checked) => {
    cameraMotionState.enabled = checked;
    uiController.clearCameraAmbientMotion();
    navigationController.applyLookState();
    uiController.applyCameraMotionSettings();
    requestSceneRender();
  },
  onBackgroundHueChange: (value) => {
    backgroundState.hueDegrees = value;
    uiController.applyBackgroundColorSettings();
    requestSceneRender();
    scheduleMaterialSettingsSave();
  },
  onBackgroundSaturationChange: (value) => {
    backgroundState.saturation = value;
    uiController.applyBackgroundColorSettings();
    requestSceneRender();
    scheduleMaterialSettingsSave();
  },
  onBackgroundValueChange: (value) => {
    backgroundState.value = value;
    uiController.applyBackgroundColorSettings();
    requestSceneRender();
    scheduleMaterialSettingsSave();
  },
  onBackgroundGammaChange: (value) => {
    backgroundState.gamma = value;
    uiController.applyBackgroundColorSettings();
    requestSceneRender();
    scheduleMaterialSettingsSave();
  },
  onBackgroundReset: () => {
    uiController.resetBackgroundColorSettings();
    requestSceneRender();
    scheduleMaterialSettingsSave();
  },
  onSkyHueChange: (value) => {
    skyState.hueDegrees = value;
    uiController.applySkyColorSettings();
    requestSceneRender();
    scheduleMaterialSettingsSave();
  },
  onSkySaturationChange: (value) => {
    skyState.saturation = value;
    uiController.applySkyColorSettings();
    requestSceneRender();
    scheduleMaterialSettingsSave();
  },
  onSkyValueChange: (value) => {
    skyState.value = value;
    uiController.applySkyColorSettings();
    requestSceneRender();
    scheduleMaterialSettingsSave();
  },
  onSkyGammaChange: (value) => {
    skyState.gamma = value;
    uiController.applySkyColorSettings();
    requestSceneRender();
    scheduleMaterialSettingsSave();
  },
  onSkyReset: () => {
    uiController.resetSkyColorSettings();
    requestSceneRender();
    scheduleMaterialSettingsSave();
  },
  onFireHueChange: (value) => {
    fireState.hueDegrees = value;
    uiController.applyFireColorSettings();
    requestSceneRender();
  },
  onFireSaturationChange: (value) => {
    fireState.saturation = value;
    uiController.applyFireColorSettings();
    requestSceneRender();
  },
  onFireValueChange: (value) => {
    fireState.value = value;
    uiController.applyFireColorSettings();
    requestSceneRender();
  },
  onReflectEnvIntensityChange: (value) => {
    reflectionState.envMapIntensity = value;
    uiController.applyReflectMaterialSettings();
    requestSceneRender();
    scheduleMaterialSettingsSave();
  },
  onReflectIorChange: (value) => {
    reflectionState.ior = value;
    uiController.applyReflectMaterialSettings();
    requestSceneRender();
    scheduleMaterialSettingsSave();
  },
  onReflectSpecularChange: (value) => {
    reflectionState.specularIntensity = value;
    uiController.applyReflectMaterialSettings();
    requestSceneRender();
    scheduleMaterialSettingsSave();
  },
  onReflectEnvRotationYChange: (value) => {
    reflectionState.envMapRotationY = value * Math.PI / 180;
    uiController.applyReflectMaterialSettings();
    requestSceneRender();
    scheduleMaterialSettingsSave();
  },
  onReflectReset: () => {
    uiController.resetReflectMaterialSettings();
    requestSceneRender();
    scheduleMaterialSettingsSave();
  },
  onBaseLowMemoryToggle: (checked) => {
    setBaseLowMemoryMode(checked);
  },
  onRenderScaleChange: (value) => {
    setRenderScale(value);
  },
  onMenuToggle: () => {
    if (helpOverlayState.isOpen) {
      setHelpOverlayOpen(false);
    }
    showDock();
    setMenuOpen(!menuController.isOpen());
  },
  onHelpToggle: () => {
    setHelpOverlayOpen(!helpOverlayState.isOpen);
    showDock();
  },
  onHelpClose: () => {
    setHelpOverlayOpen(false);
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
viewerLifecycleController = createViewerLifecycle({
  clock,
  state,
  uiController,
  navigationController,
  sceneLayerLoader,
  getRenderMode,
  renderSceneFrame,
  updatePerformanceDiagnostics,
  rendererDomElement: renderer.domElement,
  updateStatus,
  disposeRuntimeResources: () => {
    if (smoothProgressState.rafId) {
      cancelAnimationFrame(smoothProgressState.rafId);
      smoothProgressState.rafId = null;
    }
    if (materialSettingsPersistenceState.saveTimeoutId) {
      clearTimeout(materialSettingsPersistenceState.saveTimeoutId);
      materialSettingsPersistenceState.saveTimeoutId = null;
    }
    unbindViewerUi?.();
    unbindDebugUi?.();
    unbindNavigationEvents?.();
    menuController.dispose?.();
    galleryOverlay.dispose?.();
    setHelpOverlayOpen(false);
    debugObjectInspector.dispose?.();
    sceneLayerLoader.dispose();
    ambientAudioController?.dispose();
    clearFallbackScene();
    reflectionEnvironment.dispose();
    selectiveBloomPipeline.dispose();
    reflectionPmremGenerator.dispose();
    renderer.renderLists.dispose();
    renderer.dispose();
  },
});

  async function init() {
    await loadMaterialSettings();
    debugObjectInspector.setEnabled(debugMode);
    navigationController.syncLookStateFromCamera();
    uiController.applyViewportColorSettings();
    uiController.applySelectiveBloomSettings();
    uiController.syncPostProcessingSize();
    uiController.applyCameraSettings();
    uiController.applyCameraMotionSettings();
    uiController.applyAmbientAudioSettings();
    uiController.applyInterfaceSettings();
    uiController.applyDebugModeSettings();
    uiController.syncRenderScaleReadouts();
    uiController.applyBackgroundColorSettings();
    uiController.applySkyColorSettings();
    uiController.applyFireColorSettings();
    uiController.applyReflectMaterialSettings();
    ambientAudioController?.start();

    const loadSceneLayersPromise = sceneLayerLoader.loadSceneLayers();
    viewerLifecycleController.start();
    await loadSceneLayersPromise;
  }

  function dispose() {
    viewerLifecycleController.dispose();
  }

  return {
    init,
    dispose,
  };
}

function detectInitialRenderScale() {
  const hardwareConcurrency = navigator.hardwareConcurrency ?? null;
  const deviceMemory = navigator.deviceMemory ?? null;
  const isMac = /Macintosh|MacIntel/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isMobile = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

  if (isIOS || (isMobile && (deviceMemory !== null && deviceMemory <= 4))) {
    return 0.4;
  }

  if (deviceMemory !== null && deviceMemory <= 4) {
    return 0.5;
  }

  if (isMac && hardwareConcurrency !== null && hardwareConcurrency <= 8) {
    return 0.65;
  }

  if (
    deviceMemory !== null
    && deviceMemory <= 8
    && hardwareConcurrency !== null
    && hardwareConcurrency <= 8
  ) {
    return 0.75;
  }

  return 1.0;
}


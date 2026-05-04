import {
  BoxGeometry,
  Clock,
  Color,
  GridHelper,
  Group,
  LinearToneMapping,
  LoadingManager,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  NoToneMapping,
  PMREMGenerator,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  TextureLoader,
  WebGLRenderer
} from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  getMissingSceneStatusMessage,
  SCENE_LOAD_STATUS_HTML,
  VIEWER_CONFIG,
} from "../config/viewerConfig.js";
import { appendAssetQuery } from "../loaders/assetResolver.js";
import { createNavigationController } from "../camera/navigationController.js";
import { createDebugObjectInspector } from "../debug/debugObjectInspector.js";
import { createPerformanceDiagnostics } from "../diagnostics/performanceDiagnostics.js";
import { createSceneLayerLoader } from "../loaders/sceneLayerLoader.js";
import { createMaterialPipeline } from "../materials/materialPipeline.js";
import { createProbeEnvironmentManager } from "../materials/probeEnvironmentManager.js";
import { createReflectionEnvironmentManager } from "../materials/reflectionEnvironment.js";
import { createSelectiveBloomPipeline } from "../postprocessing/createSelectiveBloomPipeline.js";
import { bindViewerUiEvents } from "../ui/debugPanelBindings.js";
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
  baseTextureCapSelect,
  joystickBase,
  joystickThumb,
  lookPad,
  flyUpButton,
  flyDownButton,
  boostButton,
} = refs;

const renderer = new WebGLRenderer({ antialias: true });
const initialViewportWidth = viewport.clientWidth || window.innerWidth;
const initialViewportHeight = viewport.clientHeight || window.innerHeight;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(initialViewportWidth, initialViewportHeight);
renderer.outputColorSpace = SRGBColorSpace;
renderer.shadowMap.enabled = false;
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
  0.05,
  5000,
);
camera.up.set(0, 1, 0);
camera.position.set(0, 1.7, 4);

const clock = new Clock();
const BLOOM_SCENE_LAYER = VIEWER_CONFIG.postProcessing.selectiveBloom.layer;
const selectiveBloomConfig = {
  ...VIEWER_CONFIG.postProcessing.selectiveBloom,
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
const state = createViewerState({
  baseViewerConfig: VIEWER_CONFIG,
  initialRuntimeOptimizationState: {
    lowMemoryBaseMipmaps: parseBooleanFlag(searchParams.get("lowMemoryBase"))
      ?? getStoredLowMemoryBaseMode()
      ?? VIEWER_CONFIG.runtimeOptimization.lowMemoryBaseMipmaps,
    baseTextureMaxSize: parseNonNegativeInteger(searchParams.get("baseTextureCap"))
      ?? getStoredBaseTextureCap()
      ?? VIEWER_CONFIG.runtimeOptimization.baseTextureMaxSize,
  },
});
const {
  runtimeOptimizationState,
  colorPipelineState,
  interfaceState,
  cameraMotionState,
  viewerConfig,
  diagnosticsState,
  backgroundState,
  fireState,
  reflectionState,
  viewerLifecycle,
  helpOverlayState,
  controlDockState,
} = state;
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

const loadingManager = new LoadingManager();
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
const textureLoader = new TextureLoader(loadingManager);
const fallbackSceneRoots = [];
const updateStatus = (message) => {
  statusLine.textContent = message;
  if (loadingStatusLine) {
    loadingStatusLine.textContent = message;
  }
};
const reflectionEnvironment = createReflectionEnvironmentManager({
  reflectionPmremGenerator,
  scene,
});
reflectionEnvironment.setProbeEnvironmentManager(probeEnvironmentManager);
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
  standard: LinearToneMapping,
  none: NoToneMapping,
};
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
});
const layerControlsRenderer = createLayerControls({
  container: layerControls,
  diagnosticsState,
  getDebugMode: () => debugMode,
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
    backgroundState,
    fireState,
    reflectionState,
  },
  renderer,
  toneMappingModes,
  selectiveBloomConfig,
  selectiveBloomPipeline,
  navigationController,
  menuController,
  getDebugMode: () => debugMode,
  isTouchDevice,
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

if (baseTextureCapSelect) {
  baseTextureCapSelect.value = `${runtimeOptimizationState.baseTextureMaxSize}`;
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

function renderSceneFrame(delta) {
  selectiveBloomPipeline.render(delta, selectiveBloomConfig);
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
  },
  isTouchDevice,
  isWalkMode,
  trackedMaterialSets: [
    backgroundState.materials,
    fireState.materials,
    reflectionState.materials,
  ],
  probeEnvironmentManager,
  setTranslucencySunDirection: materialPipeline.setTranslucencySunDirection,
});
const unbindNavigationEvents = navigationController.bindInputEvents({
  getMenuOpen: () => menuController.isOpen() || helpOverlayState.isOpen,
  onToggleMenu: () => {
    if (helpOverlayState.isOpen) {
      setHelpOverlayOpen(false);
    }

    showDock();
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
    if (VIEWER_CONFIG.interface.dock.hideOnMovement) {
      hideDock();
    }
  },
});
const unbindDebugUi = debugObjectInspector.bindUi();
const unbindViewerUi = bindViewerUiEvents({
  refs,
  onToneMappingChange: (value) => {
    colorPipelineState.toneMapping = value;
    uiController.applyViewportColorSettings();
  },
  onExposureChange: (value) => {
    colorPipelineState.exposure = value;
    uiController.applyViewportColorSettings();
    showDock();
  },
  onSelectiveBloomStrengthChange: (value) => {
    selectiveBloomConfig.strength = value;
    uiController.applySelectiveBloomSettings();
  },
  onCameraFovChange: (value) => {
    navigationController.cameraState.fov = value;
    uiController.applyCameraSettings();
    showDock();
  },
  onCameraHeightChange: (value) => {
    navigationController.cameraState.height = value;
    uiController.applyCameraSettings();
    showDock();
  },
  onShowCrosshairChange: (checked) => {
    interfaceState.showCrosshair = checked;
    uiController.applyInterfaceSettings();
  },
  onCameraShakeChange: (checked) => {
    cameraMotionState.enabled = checked;
    uiController.clearCameraAmbientMotion();
    navigationController.applyLookState();
    uiController.applyCameraMotionSettings();
  },
  onBackgroundHueChange: (value) => {
    backgroundState.hueDegrees = value;
    uiController.applyBackgroundColorSettings();
  },
  onBackgroundSaturationChange: (value) => {
    backgroundState.saturation = value;
    uiController.applyBackgroundColorSettings();
  },
  onBackgroundValueChange: (value) => {
    backgroundState.value = value;
    uiController.applyBackgroundColorSettings();
  },
  onFireHueChange: (value) => {
    fireState.hueDegrees = value;
    uiController.applyFireColorSettings();
  },
  onFireSaturationChange: (value) => {
    fireState.saturation = value;
    uiController.applyFireColorSettings();
  },
  onFireValueChange: (value) => {
    fireState.value = value;
    uiController.applyFireColorSettings();
  },
  onReflectEnvIntensityChange: (value) => {
    reflectionState.envMapIntensity = value;
    uiController.applyReflectMaterialSettings();
  },
  onReflectIorChange: (value) => {
    reflectionState.ior = value;
    uiController.applyReflectMaterialSettings();
  },
  onReflectSpecularChange: (value) => {
    reflectionState.specularIntensity = value;
    uiController.applyReflectMaterialSettings();
  },
  onReflectMetalnessChange: (value) => {
    reflectionState.metalness = value;
    uiController.applyReflectMaterialSettings();
  },
  onReflectEnvRotationYChange: (value) => {
    reflectionState.envMapRotationY = value * Math.PI / 180;
    uiController.applyReflectMaterialSettings();
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
const viewerLifecycleController = createViewerLifecycle({
  clock,
  state,
  uiController,
  navigationController,
  menuController,
  sceneLayerLoader,
  renderSceneFrame,
  updatePerformanceDiagnostics,
  disposeRuntimeResources: () => {
    unbindViewerUi?.();
    unbindDebugUi?.();
    unbindNavigationEvents?.();
    menuController.dispose?.();
    setHelpOverlayOpen(false);
    debugObjectInspector.dispose?.();
    sceneLayerLoader.dispose();
    clearFallbackScene();
    reflectionEnvironment.dispose();
    selectiveBloomPipeline.dispose();
    reflectionPmremGenerator.dispose();
    renderer.renderLists.dispose();
    renderer.dispose();
  },
});

  async function init() {
    debugObjectInspector.setEnabled(debugMode);
    navigationController.syncLookStateFromCamera();
    uiController.applyViewportColorSettings();
    uiController.applySelectiveBloomSettings();
    uiController.syncPostProcessingSize();
    uiController.applyCameraSettings();
    uiController.applyCameraMotionSettings();
    uiController.applyInterfaceSettings();
    uiController.applyDebugModeSettings();
    uiController.applyBackgroundColorSettings();
    uiController.applyFireColorSettings();
    uiController.applyReflectMaterialSettings();

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


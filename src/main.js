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

const app = document.querySelector("#app");
const viewport = document.createElement("div");
viewport.className = "viewport";
const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
const isWalkMode = VIEWER_CONFIG.locomotion.mode === "walk";
const desktopControlText = isWalkMode
  ? "<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk, <kbd>Shift</kbd> sprint, mouse looks around, <kbd>Esc</kbd> unlocks cursor."
  : "<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move, <kbd>Space</kbd> up, <kbd>C</kbd> down, <kbd>Shift</kbd> boost, mouse wheel changes speed, <kbd>Esc</kbd> unlocks cursor.";
const touchControlText = isWalkMode
  ? "Left thumb walks, right side looks around, boost button sprints."
  : "Left thumb moves, right side looks around, buttons on the right control up, down and boost.";

const hud = document.createElement("div");
hud.className = "hud";
hud.innerHTML = `
  <button type="button" class="menu-toggle" data-menu-toggle aria-expanded="false">
    <span>Menu</span>
    <kbd>M</kbd>
  </button>
  <div class="hud-panel" data-hud-panel hidden>
    <div class="hud-header">
      <div>
        <h1>Viewer Menu</h1>
        <p>${isTouchDevice
          ? `Touch controls are enabled for mobile ${isWalkMode ? "walking" : "flight"}.`
          : `Menu pauses controls so you can tune the scene without fighting pointer lock.`}</p>
      </div>
      <button type="button" class="menu-close" data-menu-close aria-label="Close menu">Close</button>
    </div>
    <p class="status" data-status>${SCENE_LOAD_STATUS_HTML}</p>
    <p>${isTouchDevice ? touchControlText : desktopControlText}</p>
    <div class="menu-section">
      <h2>Viewport</h2>
      <div class="color-tools">
        <label class="field field-range">
          <span>Exposure</span>
          <input type="range" min="0.25" max="2.5" step="0.01" value="${VIEWER_CONFIG.colorPipeline.exposure}" data-exposure />
          <output data-exposure-value>${VIEWER_CONFIG.colorPipeline.exposure.toFixed(2)}</output>
        </label>
        <label class="field field-range">
          <span>FOV</span>
          <input type="range" min="30" max="110" step="1" value="${VIEWER_CONFIG.camera.fov}" data-camera-fov />
          <output data-camera-fov-value>${VIEWER_CONFIG.camera.fov.toFixed(0)}°</output>
        </label>
        <label class="field field-range">
          <span>Camera Height</span>
          <input type="range" min="0.5" max="2.5" step="0.01" value="${VIEWER_CONFIG.camera.height}" data-camera-height />
          <output data-camera-height-value>${VIEWER_CONFIG.camera.height.toFixed(2)}</output>
        </label>
        <label class="layer-toggle">
          <input type="checkbox" data-show-crosshair ${VIEWER_CONFIG.interface.showCrosshair ? "checked" : ""} />
          <span class="layer-toggle-copy">
            <strong>Show Crosshair</strong>
            <small>Toggle the center reticle on desktop.</small>
          </span>
        </label>
        <label class="layer-toggle">
          <input type="checkbox" data-camera-shake ${VIEWER_CONFIG.camera.ambientMotion.enabled ? "checked" : ""} />
          <span class="layer-toggle-copy">
            <strong>Camera Shake</strong>
            <small>Toggle the subtle ambient camera drift.</small>
          </span>
        </label>
      </div>
    </div>
    <div class="menu-section">
      <h2>Stats</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <span>FPS</span>
          <strong data-stat-fps>0</strong>
        </div>
        <div class="stat-card">
          <span>Frame</span>
          <strong data-stat-frame-ms>0.0 ms</strong>
        </div>
        <div class="stat-card">
          <span>Draw Calls</span>
          <strong data-stat-draw-calls>0</strong>
        </div>
        <div class="stat-card">
          <span>Triangles</span>
          <strong data-stat-triangles>0</strong>
        </div>
      </div>
    </div>
    <div class="menu-section" data-debug-only>
      <h2>Viewport Advanced</h2>
      <div class="color-tools">
        <label class="field">
          <span>View Transform</span>
          <select data-tone-mapping>
            <option value="standard">Standard</option>
            <option value="none">None</option>
          </select>
        </label>
      </div>
    </div>
    <div class="menu-section" data-debug-only>
      <h2>Background</h2>
      <div class="color-tools">
        <label class="field field-range">
          <span>Hue</span>
          <input type="range" min="-180" max="180" step="1" value="${VIEWER_CONFIG.materialPresets.background.hueDegrees}" data-background-hue />
          <output data-background-hue-value>${VIEWER_CONFIG.materialPresets.background.hueDegrees.toFixed(0)}°</output>
        </label>
        <label class="field field-range">
          <span>Saturation</span>
          <input type="range" min="0" max="2" step="0.01" value="${VIEWER_CONFIG.materialPresets.background.saturation}" data-background-saturation />
          <output data-background-saturation-value>${VIEWER_CONFIG.materialPresets.background.saturation.toFixed(2)}</output>
        </label>
        <label class="field field-range">
          <span>Value</span>
          <input type="range" min="0" max="2" step="0.01" value="${VIEWER_CONFIG.materialPresets.background.value}" data-background-value />
          <output data-background-value-output>${VIEWER_CONFIG.materialPresets.background.value.toFixed(2)}</output>
        </label>
      </div>
    </div>
    <div class="menu-section" data-debug-only>
      <h2>Fire</h2>
      <div class="color-tools">
        <label class="field field-range">
          <span>Hue</span>
          <input type="range" min="-180" max="180" step="1" value="${VIEWER_CONFIG.materialPresets.fireVideo.hueDegrees}" data-fire-hue />
          <output data-fire-hue-value>${VIEWER_CONFIG.materialPresets.fireVideo.hueDegrees.toFixed(0)}°</output>
        </label>
        <label class="field field-range">
          <span>Saturation</span>
          <input type="range" min="0" max="2" step="0.01" value="${VIEWER_CONFIG.materialPresets.fireVideo.saturation}" data-fire-saturation />
          <output data-fire-saturation-value>${VIEWER_CONFIG.materialPresets.fireVideo.saturation.toFixed(2)}</output>
        </label>
        <label class="field field-range">
          <span>Value</span>
          <input type="range" min="0" max="2" step="0.01" value="${VIEWER_CONFIG.materialPresets.fireVideo.value}" data-fire-value />
          <output data-fire-value-output>${VIEWER_CONFIG.materialPresets.fireVideo.value.toFixed(2)}</output>
        </label>
      </div>
    </div>
    <div class="menu-section" data-debug-only>
      <h2>Reflect</h2>
      <div class="color-tools">
        <label class="field field-range">
          <span>Env Intensity</span>
          <input type="range" min="0" max="4" step="0.01" value="${VIEWER_CONFIG.materialPresets.reflectMaterial.envMapIntensity}" data-reflect-env-intensity />
          <output data-reflect-env-intensity-value>${VIEWER_CONFIG.materialPresets.reflectMaterial.envMapIntensity.toFixed(2)}</output>
        </label>
        <label class="field field-range">
          <span>IOR</span>
          <input type="range" min="1" max="2.5" step="0.01" value="${VIEWER_CONFIG.materialPresets.reflectMaterial.ior}" data-reflect-ior />
          <output data-reflect-ior-value>${VIEWER_CONFIG.materialPresets.reflectMaterial.ior.toFixed(2)}</output>
        </label>
        <label class="field field-range">
          <span>Specular</span>
          <input type="range" min="0" max="1" step="0.01" value="${VIEWER_CONFIG.materialPresets.reflectMaterial.specularIntensity}" data-reflect-specular />
          <output data-reflect-specular-value>${VIEWER_CONFIG.materialPresets.reflectMaterial.specularIntensity.toFixed(2)}</output>
        </label>
        <label class="field field-range">
          <span>Metalness</span>
          <input type="range" min="0" max="1" step="0.01" value="${VIEWER_CONFIG.materialPresets.reflectMaterial.defaultMetalness}" data-reflect-metalness />
          <output data-reflect-metalness-value>${VIEWER_CONFIG.materialPresets.reflectMaterial.defaultMetalness.toFixed(2)}</output>
        </label>
      </div>
    </div>
    <div class="menu-section" data-debug-only>
      <h2>Layers</h2>
      <div class="layer-controls" data-layer-controls>
        <p class="empty-state">Layers will appear here after scene load.</p>
      </div>
    </div>
    <div class="menu-section" data-debug-only>
      <h2>Object Inspector</h2>
      <div class="layer-controls">
        <p class="debug-note" data-object-selection-hint>No object selected yet. Click Pick Object, then click the scene.</p>
        <div class="button-row">
          <button type="button" class="action-button" data-pick-object>Pick Object</button>
          <button type="button" class="action-button is-secondary" data-reset-object-override>Reset Selected</button>
        </div>
        <div class="debug-target-card">
          <div class="debug-target-row"><span>Layer</span><strong data-selected-layer-id>None</strong></div>
          <div class="debug-target-row"><span>Mesh</span><strong data-selected-mesh-name>None</strong></div>
          <div class="debug-target-row"><span>Material</span><strong data-selected-material-name>None</strong></div>
          <div class="debug-target-row"><span>Status</span><strong data-selected-target-support>No target</strong></div>
        </div>
        <div class="color-tools">
          <label class="field field-range">
            <span>Hue</span>
            <input type="range" min="-180" max="180" step="1" value="0" data-object-hue />
            <output data-object-hue-value>0°</output>
          </label>
          <label class="field field-range">
            <span>Saturation</span>
            <input type="range" min="0" max="2" step="0.01" value="1" data-object-saturation />
            <output data-object-saturation-value>1.00</output>
          </label>
          <label class="field field-range">
            <span>Value</span>
            <input type="range" min="0" max="2" step="0.01" value="1" data-object-value />
            <output data-object-value-value>1.00</output>
          </label>
          <label class="field field-range">
            <span>Gamma</span>
            <input type="range" min="0.2" max="3" step="0.01" value="1" data-object-gamma />
            <output data-object-gamma-value>1.00</output>
          </label>
        </div>
        <div class="button-row">
          <button type="button" class="action-button" data-copy-object-overrides>Copy Overrides JSON</button>
          <button type="button" class="action-button is-secondary" data-save-object-overrides>Save Overrides JSON</button>
        </div>
        <p class="debug-note" data-object-overrides-status>Local object overrides will appear here.</p>
      </div>
    </div>
    <div class="menu-section" data-debug-only>
      <h2>Session</h2>
      <div class="layer-controls">
        <p class="debug-note" data-debug-session-note>Debug tools are active for this URL.</p>
        <div class="button-row">
          <button type="button" class="action-button" data-reload-assets>Reload Assets</button>
          <button type="button" class="action-button is-secondary" data-exit-debug>Exit Debug</button>
        </div>
      </div>
    </div>
    <div class="menu-section" data-debug-only>
      <h2>Performance</h2>
      <div class="layer-controls">
        <label class="layer-toggle">
          <input type="checkbox" data-base-low-memory />
          <span class="layer-toggle-copy">
            <strong>Low-memory base textures</strong>
            <small>Disables mipmaps on the baked base layer to reduce texture VRAM at the cost of distance quality.</small>
          </span>
        </label>
        <label class="field">
          <span>Base Texture Cap</span>
          <select data-base-texture-cap>
            <option value="0">Off</option>
            <option value="4096">4096</option>
            <option value="3072">3072</option>
            <option value="2048">2048</option>
            <option value="1024">1024</option>
          </select>
        </label>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <span>Textures</span>
          <strong data-stat-textures>0</strong>
        </div>
        <div class="stat-card">
          <span>Texture VRAM</span>
          <strong data-stat-texture-memory>0 MB</strong>
        </div>
      </div>
      <p class="performance-note" data-performance-note>Approximate runtime view for the currently visible layers.</p>
    </div>
  </div>
`;

const loadingScreen = document.createElement("div");
loadingScreen.className = "loading-screen is-visible";
loadingScreen.innerHTML = `
  <div class="loading-card">
    <p class="loading-kicker">University Place</p>
    <h1>Loading Scene</h1>
    <p class="loading-copy" data-loading-status>${SCENE_LOAD_STATUS_HTML}</p>
    <div class="loading-bar" aria-hidden="true">
      <span class="loading-bar-fill"></span>
    </div>
  </div>
`;

const crosshair = document.createElement("div");
crosshair.className = "crosshair";

const mobileControls = document.createElement("div");
mobileControls.className = `mobile-controls${isTouchDevice ? " is-visible" : ""}`;
mobileControls.innerHTML = `
  <div class="joystick-shell">
    <div class="joystick" data-joystick>
      <div class="joystick-thumb" data-joystick-thumb></div>
    </div>
  </div>
  <div class="lookpad" data-lookpad>
    <span>Look</span>
  </div>
  <div class="mobile-buttons">
    ${isWalkMode ? "" : '<button type="button" data-fly-up>Up</button><button type="button" data-fly-down>Down</button>'}
    <button type="button" data-boost>${isWalkMode ? "Sprint" : "Boost"}</button>
  </div>
`;

viewport.append(loadingScreen, hud, crosshair, mobileControls);
app.append(viewport);

const statusLine = hud.querySelector("[data-status]");
const loadingStatusLine = loadingScreen.querySelector("[data-loading-status]");
const menuToggleButton = hud.querySelector("[data-menu-toggle]");
const menuCloseButton = hud.querySelector("[data-menu-close]");
const hudPanel = hud.querySelector("[data-hud-panel]");
const debugOnlySections = [...hud.querySelectorAll("[data-debug-only]")];
const toneMappingSelect = hud.querySelector("[data-tone-mapping]");
const exposureSlider = hud.querySelector("[data-exposure]");
const exposureValue = hud.querySelector("[data-exposure-value]");
const cameraFovSlider = hud.querySelector("[data-camera-fov]");
const cameraFovValue = hud.querySelector("[data-camera-fov-value]");
const cameraHeightSlider = hud.querySelector("[data-camera-height]");
const cameraHeightValue = hud.querySelector("[data-camera-height-value]");
const showCrosshairToggle = hud.querySelector("[data-show-crosshair]");
const cameraShakeToggle = hud.querySelector("[data-camera-shake]");
const backgroundHueSlider = hud.querySelector("[data-background-hue]");
const backgroundHueValue = hud.querySelector("[data-background-hue-value]");
const backgroundSaturationSlider = hud.querySelector("[data-background-saturation]");
const backgroundSaturationValue = hud.querySelector("[data-background-saturation-value]");
const backgroundValueSlider = hud.querySelector("[data-background-value]");
const backgroundValueOutput = hud.querySelector("[data-background-value-output]");
const fireHueSlider = hud.querySelector("[data-fire-hue]");
const fireHueValue = hud.querySelector("[data-fire-hue-value]");
const fireSaturationSlider = hud.querySelector("[data-fire-saturation]");
const fireSaturationValue = hud.querySelector("[data-fire-saturation-value]");
const fireValueSlider = hud.querySelector("[data-fire-value]");
const fireValueOutput = hud.querySelector("[data-fire-value-output]");
const reflectEnvIntensitySlider = hud.querySelector("[data-reflect-env-intensity]");
const reflectEnvIntensityValue = hud.querySelector("[data-reflect-env-intensity-value]");
const reflectIorSlider = hud.querySelector("[data-reflect-ior]");
const reflectIorValue = hud.querySelector("[data-reflect-ior-value]");
const reflectSpecularSlider = hud.querySelector("[data-reflect-specular]");
const reflectSpecularValue = hud.querySelector("[data-reflect-specular-value]");
const reflectMetalnessSlider = hud.querySelector("[data-reflect-metalness]");
const reflectMetalnessValue = hud.querySelector("[data-reflect-metalness-value]");
const layerControls = hud.querySelector("[data-layer-controls]");
const statFps = hud.querySelector("[data-stat-fps]");
const statFrameMs = hud.querySelector("[data-stat-frame-ms]");
const statDrawCalls = hud.querySelector("[data-stat-draw-calls]");
const statTriangles = hud.querySelector("[data-stat-triangles]");
const statTextures = hud.querySelector("[data-stat-textures]");
const statTextureMemory = hud.querySelector("[data-stat-texture-memory]");
const performanceNote = hud.querySelector("[data-performance-note]");
const baseLowMemoryToggle = hud.querySelector("[data-base-low-memory]");
const baseTextureCapSelect = hud.querySelector("[data-base-texture-cap]");
const debugSessionNote = hud.querySelector("[data-debug-session-note]");
const reloadAssetsButton = hud.querySelector("[data-reload-assets]");
const exitDebugButton = hud.querySelector("[data-exit-debug]");
const objectSelectionHint = hud.querySelector("[data-object-selection-hint]");
const pickObjectButton = hud.querySelector("[data-pick-object]");
const resetObjectOverrideButton = hud.querySelector("[data-reset-object-override]");
const selectedLayerId = hud.querySelector("[data-selected-layer-id]");
const selectedMeshName = hud.querySelector("[data-selected-mesh-name]");
const selectedMaterialName = hud.querySelector("[data-selected-material-name]");
const selectedTargetSupport = hud.querySelector("[data-selected-target-support]");
const objectHueSlider = hud.querySelector("[data-object-hue]");
const objectHueValue = hud.querySelector("[data-object-hue-value]");
const objectSaturationSlider = hud.querySelector("[data-object-saturation]");
const objectSaturationValue = hud.querySelector("[data-object-saturation-value]");
const objectValueSlider = hud.querySelector("[data-object-value]");
const objectValueValue = hud.querySelector("[data-object-value-value]");
const objectGammaSlider = hud.querySelector("[data-object-gamma]");
const objectGammaValue = hud.querySelector("[data-object-gamma-value]");
const copyObjectOverridesButton = hud.querySelector("[data-copy-object-overrides]");
const saveObjectOverridesButton = hud.querySelector("[data-save-object-overrides]");
const objectOverridesStatus = hud.querySelector("[data-object-overrides-status]");
const joystickBase = mobileControls.querySelector("[data-joystick]");
const joystickThumb = mobileControls.querySelector("[data-joystick-thumb]");
const lookPad = mobileControls.querySelector("[data-lookpad]");
const flyUpButton = mobileControls.querySelector("[data-fly-up]");
const flyDownButton = mobileControls.querySelector("[data-fly-down]");
const boostButton = mobileControls.querySelector("[data-boost]");

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
const debugMode = parseBooleanFlag(searchParams.get("debug")) ?? false;
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

const uiState = {
  menuOpen: false,
  relockAfterMenuClose: false,
};
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
  getMenuOpen: () => uiState.menuOpen,
  ui: {
    pickButton: pickObjectButton,
    resetButton: resetObjectOverrideButton,
    copyButton: copyObjectOverridesButton,
    saveButton: saveObjectOverridesButton,
    selectionHint: objectSelectionHint,
    selectionLayer: selectedLayerId,
    selectionMesh: selectedMeshName,
    selectionMaterial: selectedMaterialName,
    selectionSupport: selectedTargetSupport,
    hueSlider: objectHueSlider,
    hueValue: objectHueValue,
    saturationSlider: objectSaturationSlider,
    saturationValue: objectSaturationValue,
    valueSlider: objectValueSlider,
    valueValue: objectValueValue,
    gammaSlider: objectGammaSlider,
    gammaValue: objectGammaValue,
    saveStatus: objectOverridesStatus,
  },
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

function setMenuOpen(nextOpen) {
  if (uiState.menuOpen === nextOpen) {
    return;
  }

  uiState.menuOpen = nextOpen;
  menuToggleButton?.setAttribute("aria-expanded", `${nextOpen}`);
  hud.classList.toggle("is-open", nextOpen);
  viewport.classList.toggle("has-menu-open", nextOpen);

  if (hudPanel) {
    hudPanel.hidden = !nextOpen;
  }

  if (nextOpen) {
    uiState.relockAfterMenuClose = navigationController.controls.isLocked && !isTouchDevice;
    navigationController.controls.unlock();
    navigationController.resetMovementInputs();
    updateStatus("Menu open. Scene controls are paused.");
    return;
  }

  if (uiState.relockAfterMenuClose && !isTouchDevice) {
    requestAnimationFrame(() => {
      navigationController.controls.lock({ ignoreCooldown: true });
    });
  }
}

function reloadWithUpdatedSearchParams(mutator) {
  const nextUrl = new URL(window.location.href);
  mutator(nextUrl.searchParams);
  window.location.assign(nextUrl.toString());
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

function addFallbackScene() {
  const grid = new THREE.GridHelper(24, 24, 0x93c5fd, 0x334155);
  grid.position.y = -0.001;
  scene.add(grid);

  const room = new THREE.Group();
  const wallMaterial = new THREE.MeshBasicMaterial({ color: "#1e293b", wireframe: true });
  const roomMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 8), wallMaterial);
  roomMesh.position.y = 2;
  room.add(roomMesh);
  scene.add(room);

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
  applyBackgroundColorSettings,
  applyFireColorSettings,
  applyReflectMaterialSettings,
  applyRuntimeTextureOptimizations,
  updatePerformanceDiagnostics,
  positionCameraAtSpawn,
  applyCameraSettings,
  setLoadingScreenVisible,
  onLayersLoaded: (loadedLayers) => {
    debugObjectInspector.setLoadedLayers(loadedLayers);
  },
  isTouchDevice,
  isWalkMode,
});

navigationController.bindInputEvents({
  getMenuOpen: () => uiState.menuOpen,
  onToggleMenu: () => setMenuOpen(!uiState.menuOpen),
  onCloseMenu: () => setMenuOpen(false),
  onResumeFireVideo: () => sceneLayerLoader.resumeFireVideoPlayback(),
});
debugObjectInspector.bindUi();
debugObjectInspector.loadOverrides();

toneMappingSelect?.addEventListener("change", (event) => {
  VIEWER_CONFIG.colorPipeline.toneMapping = event.target.value;
  applyViewportColorSettings();
});

exposureSlider?.addEventListener("input", (event) => {
  VIEWER_CONFIG.colorPipeline.exposure = Number(event.target.value);
  applyViewportColorSettings();
});

cameraFovSlider?.addEventListener("input", (event) => {
  navigationController.cameraState.fov = Number(event.target.value);
  applyCameraSettings();
});

cameraHeightSlider?.addEventListener("input", (event) => {
  navigationController.cameraState.height = Number(event.target.value);
  applyCameraSettings();
});

showCrosshairToggle?.addEventListener("change", (event) => {
  VIEWER_CONFIG.interface.showCrosshair = Boolean(event.target.checked);
  applyInterfaceSettings();
});

cameraShakeToggle?.addEventListener("change", (event) => {
  VIEWER_CONFIG.camera.ambientMotion.enabled = Boolean(event.target.checked);
  clearCameraAmbientMotion();
  navigationController.applyLookState();
  applyCameraMotionSettings();
});

backgroundHueSlider?.addEventListener("input", (event) => {
  backgroundState.hueDegrees = Number(event.target.value);
  applyBackgroundColorSettings();
});

backgroundSaturationSlider?.addEventListener("input", (event) => {
  backgroundState.saturation = Number(event.target.value);
  applyBackgroundColorSettings();
});

backgroundValueSlider?.addEventListener("input", (event) => {
  backgroundState.value = Number(event.target.value);
  applyBackgroundColorSettings();
});

fireHueSlider?.addEventListener("input", (event) => {
  fireState.hueDegrees = Number(event.target.value);
  applyFireColorSettings();
});

fireSaturationSlider?.addEventListener("input", (event) => {
  fireState.saturation = Number(event.target.value);
  applyFireColorSettings();
});

fireValueSlider?.addEventListener("input", (event) => {
  fireState.value = Number(event.target.value);
  applyFireColorSettings();
});

reflectEnvIntensitySlider?.addEventListener("input", (event) => {
  reflectionState.envMapIntensity = Number(event.target.value);
  applyReflectMaterialSettings();
});

reflectIorSlider?.addEventListener("input", (event) => {
  reflectionState.ior = Number(event.target.value);
  applyReflectMaterialSettings();
});

reflectSpecularSlider?.addEventListener("input", (event) => {
  reflectionState.specularIntensity = Number(event.target.value);
  applyReflectMaterialSettings();
});

reflectMetalnessSlider?.addEventListener("input", (event) => {
  reflectionState.metalness = Number(event.target.value);
  applyReflectMaterialSettings();
});

baseLowMemoryToggle?.addEventListener("change", (event) => {
  setBaseLowMemoryMode(Boolean(event.target.checked));
});

baseTextureCapSelect?.addEventListener("change", (event) => {
  setBaseTextureCap(parsePositiveInteger(event.target.value) ?? 0);
});

menuToggleButton?.addEventListener("click", () => {
  setMenuOpen(!uiState.menuOpen);
});

menuCloseButton?.addEventListener("click", () => {
  setMenuOpen(false);
});

reloadAssetsButton?.addEventListener("click", () => {
  reloadWithUpdatedSearchParams((nextSearchParams) => {
    nextSearchParams.set("assetBust", `${Date.now()}`);
    if (debugMode) {
      nextSearchParams.set("debug", "1");
    }
  });
});

exitDebugButton?.addEventListener("click", () => {
  reloadWithUpdatedSearchParams((nextSearchParams) => {
    nextSearchParams.delete("debug");
  });
});

function animate() {
  const delta = clock.getDelta();
  clearCameraAmbientMotion();
  sceneLayerLoader.syncFireVideoPlayback();
  updateBackgroundMotion(delta);
  navigationController.updateMovement(delta, uiState.menuOpen);
  applyCameraAmbientMotion(delta);
  renderer.render(scene, camera);
  diagnosticsState.frameAccumulator += delta;
  diagnosticsState.frameCounter += 1;
  if (diagnosticsState.frameAccumulator >= 0.25) {
    diagnosticsState.fps = diagnosticsState.frameCounter / diagnosticsState.frameAccumulator;
    diagnosticsState.frameMs = (diagnosticsState.frameAccumulator / diagnosticsState.frameCounter) * 1000;
    diagnosticsState.frameAccumulator = 0;
    diagnosticsState.frameCounter = 0;
    updatePerformanceDiagnostics();
  }
  requestAnimationFrame(animate);
}

navigationController.syncLookStateFromCamera();
applyViewportColorSettings();
applyCameraSettings();
applyCameraMotionSettings();
applyInterfaceSettings();
applyDebugModeSettings();
applyBackgroundColorSettings();
applyFireColorSettings();
applyReflectMaterialSettings();
sceneLayerLoader.loadSceneLayers();
animate();

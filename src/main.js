import "./style.css";

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const app = document.querySelector("#app");
const viewport = document.createElement("div");
viewport.className = "viewport";
const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
const VIEWER_CONFIG = {
  debug: {
    logMaterialTargets: false,
  },
  colorPipeline: {
    toneMapping: "standard",
    exposure: 0.95,
  },
  camera: {
    fov: 75,
    height: 1.2,
    ambientMotion: {
      enabled: true,
      positionX: 0.014,
      positionY: 0.0245,
      positionZ: 0.0084,
      yawDegrees: 0.175,
      pitchDegrees: 0.126,
      speed: 0.364,
    },
  },
  runtimeOptimization: {
    frustumCulling: true,
    lowMemoryBaseMipmaps: false,
    baseTextureMaxSize: 0,
  },
  interface: {
    showCrosshair: true,
  },
  sceneLayers: [
    {
      id: "background",
      label: "Background",
      searchParam: "background",
      materialMode: "background",
      required: false,
      candidates: [
        "/assets/scene/background.glb",
        "/assets/scene/background.gltf",
        "/assets/scene/bg.glb",
        "/assets/scene/bg.gltf",
        "/assets/scene/backdrop.glb",
        "/assets/scene/backdrop.gltf",
      ],
    },
    {
      id: "bg360",
      label: "BG360",
      searchParam: "bg360",
      materialMode: "unlitAlpha",
      required: false,
      candidates: [
        "/assets/scene/BG360.glb",
        "/assets/scene/BG360.gltf",
      ],
    },
    {
      id: "base",
      label: "Base",
      searchParam: "scene",
      materialMode: "baked",
      required: true,
      candidates: ["/assets/scene/scene.glb", "/assets/scene/scene.gltf"],
    },
    {
      id: "alpha",
      label: "Alpha",
      searchParam: "alpha",
      materialMode: "alphaCutout",
      required: false,
      candidates: [
        "/assets/scene/alpha.glb",
        "/assets/scene/alpha.gltf",
        "/assets/scene/leaves.glb",
        "/assets/scene/leaves.gltf",
        "/assets/scene/leaf.glb",
        "/assets/scene/leaf.gltf",
        "/assets/scene/foliage.glb",
        "/assets/scene/foliage.gltf",
      ],
    },
    {
      id: "glass",
      label: "Glass",
      searchParam: "glass",
      materialMode: "glass",
      required: false,
      candidates: ["/assets/scene/glass.glb", "/assets/scene/glass.gltf"],
    },
    {
      id: "reflect",
      label: "Reflect",
      searchParam: "reflect",
      materialMode: "reflect",
      required: false,
      candidates: ["/assets/scene/reflect.glb", "/assets/scene/reflect.gltf"],
    },
    {
      id: "fx",
      label: "FX",
      searchParam: "fx",
      materialMode: "fx",
      required: false,
      candidates: [
        "/assets/scene/fx.glb",
        "/assets/scene/fx.gltf",
        "/assets/scene/fire.glb",
        "/assets/scene/fire.gltf",
      ],
    },
  ],
  locomotion: {
    mode: "walk",
    eyeHeight: 1.2,
    floorOffset: 0.02,
    startPosition: { x: 0.8028, y: 0.50449, z: -0.54815 },
    startLookAt: null,
    startYawDegrees: 180,
    startPitchDegrees: 0,
    fixedFloorY: 0,
  },
  materialTweaks: [
    {
      id: "background",
      materialNameIncludes: ["background", "backdrop", "panorama", "sky"],
      meshNameIncludes: ["background", "backdrop", "panorama", "sky", "dome"],
      brightness: 1.12,
      saturation: 0.82,
      excludeFromGameplayBounds: true,
    },
  ],
  materialPresets: {
    alphaCutoff: 0.5,
    glassOpacity: 0.22,
    glassAlphaCutoff: 0.02,
    glassFresnel: {
      centerOpacity: 0.08,
      edgeOpacity: 0.34,
      power: 3.6,
      edgeTintStrength: 0.18,
    },
    fxAlphaCutoff: 0.05,
    fxUvChannels: {
      color: 1,
      alpha: 1,
    },
    fireVideo: {
      searchParam: "fireVideo",
      candidates: [
        "/assets/scene/fire.mp4",
        "/assets/scene/fire.webm",
        "/assets/scene/fx.mp4",
        "/assets/scene/fx.webm",
      ],
      matchIncludes: ["fire", "flame", "ember"],
      blackPoint: 0.06,
      whitePoint: 0.34,
      brightnessBoost: 1.15,
      hueDegrees: -15,
      saturation: 1.04,
      value: 0.16,
    },
    useFallbackMapAlphaFromSeparateUv: false,
    foliageDisableMipmaps: false,
    foliagePremultiplyAlpha: true,
    foliageAnisotropy: 4,
    alphaCutoutUvChannels: {
      color: 0,
      alpha: 1,
    },
    reflectUvChannels: {
      color: 0,
      roughness: 1,
      metalness: 1,
      ao: 1,
      normal: 0,
    },
    reflectMaterial: {
      searchParam: "reflectEnv",
      candidates: [
        "/assets/scene/cubemap.png",
        "/assets/scene/cubemap.jpg",
        "/assets/scene/cubemap.jpeg",
      ],
      envMapIntensity: 1.0,
      defaultRoughness: 1.0,
      defaultMetalness: 0.0,
      ior: 1.5,
      specularIntensity: 1.0,
    },
    background: {
      hueDegrees: 0,
      saturation: 0.77,
      value: 1.15,
      rotationDegreesPerMinute: 0,
      warpStrength: 0.0056,
      warpScale: 24,
      warpSpeed: 0.12,
      shimmerStrength: 0.06,
      shimmerSpeed: 0.16,
    },
  },
};
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
    <p class="status" data-status>Looking for <code>/assets/scene/scene.glb</code> and optional <code>background</code>, <code>alpha</code>, <code>glass</code>, <code>reflect</code>, <code>fx</code> layers...</p>
    <p>${isTouchDevice ? touchControlText : desktopControlText}</p>
    <div class="menu-section">
      <h2>Viewport</h2>
      <div class="color-tools">
        <label class="field">
          <span>View Transform</span>
          <select data-tone-mapping>
            <option value="standard">Standard</option>
            <option value="none">None</option>
          </select>
        </label>
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
    <div class="menu-section">
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
    <div class="menu-section">
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
    <div class="menu-section">
      <h2>Layers</h2>
      <div class="layer-controls" data-layer-controls>
        <p class="empty-state">Layers will appear here after scene load.</p>
      </div>
    </div>
    <div class="menu-section">
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
    <p class="loading-copy" data-loading-status>Looking for <code>/assets/scene/scene.glb</code> and optional <code>background</code>, <code>alpha</code>, <code>glass</code>, <code>reflect</code>, <code>fx</code> layers...</p>
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
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
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

const keys = new Set();
const movement = {
  baseSpeed: 1.5,
  boostMultiplier: 3.5,
};
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
const touchInput = {
  moveX: 0,
  moveZ: 0,
  moveY: 0,
  boost: false,
  joystickTouchId: null,
  lookTouchId: null,
  lastLookX: 0,
  lastLookY: 0,
};
const sceneMetrics = {
  bounds: new THREE.Box3(),
  center: new THREE.Vector3(),
  size: new THREE.Vector3(),
  groundY: 0,
  walkY: VIEWER_CONFIG.locomotion.eyeHeight,
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
const fxState = {
  videoUrl: null,
  videoElement: null,
  videoTexture: null,
  lastResumeAttemptAt: 0,
};
const fireState = {
  hueDegrees: VIEWER_CONFIG.materialPresets.fireVideo.hueDegrees,
  saturation: VIEWER_CONFIG.materialPresets.fireVideo.saturation,
  value: VIEWER_CONFIG.materialPresets.fireVideo.value,
  materials: new Set(),
};
const reflectionState = {
  envUrl: null,
  envTexture: null,
  envMapIntensity: VIEWER_CONFIG.materialPresets.reflectMaterial.envMapIntensity,
  ior: VIEWER_CONFIG.materialPresets.reflectMaterial.ior,
  specularIntensity: VIEWER_CONFIG.materialPresets.reflectMaterial.specularIntensity,
  metalness: VIEWER_CONFIG.materialPresets.reflectMaterial.defaultMetalness,
  materials: new Set(),
};

const tmpForward = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpUp = new THREE.Vector3();
const velocity = new THREE.Vector3();
const tmpBox = new THREE.Box3();
const lookState = {
  pitch: 0,
  yaw: 0,
  sensitivity: 0.002,
  minPitch: -Math.PI / 2,
  maxPitch: Math.PI / 2,
};
const cameraState = {
  fov: VIEWER_CONFIG.camera.fov,
  height: VIEWER_CONFIG.camera.height,
  lastAppliedHeight: VIEWER_CONFIG.camera.height,
  ambientMotionTime: 0,
  lastOffset: new THREE.Vector3(),
  lastYawOffset: 0,
  lastPitchOffset: 0,
};
const pointerLockState = {
  unlockCooldownMs: 400,
  lastUnlockAt: 0,
};
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

const controls = {
  lock({ ignoreCooldown = false } = {}) {
    if (this.isLocked) {
      return;
    }

    if (uiState.menuOpen) {
      return;
    }

    const timeSinceUnlock = performance.now() - pointerLockState.lastUnlockAt;
    if (!ignoreCooldown && timeSinceUnlock < pointerLockState.unlockCooldownMs) {
      updateStatus("Pointer lock was just released. Click again in a moment.");
      return;
    }

    const maybePromise = renderer.domElement.requestPointerLock();
    if (maybePromise?.catch) {
      maybePromise.catch(() => {
        updateStatus("Click once more to re-capture the mouse.");
      });
    }
  },
  unlock() {
    if (this.isLocked) {
      document.exitPointerLock();
    }
  },
  get isLocked() {
    return document.pointerLockElement === renderer.domElement;
  },
};

function updateStatus(message) {
  statusLine.textContent = message;
  if (loadingStatusLine) {
    loadingStatusLine.innerHTML = message;
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
  VIEWER_CONFIG.camera.fov = cameraState.fov;
  VIEWER_CONFIG.camera.height = cameraState.height;
  VIEWER_CONFIG.locomotion.eyeHeight = cameraState.height;

  camera.fov = cameraState.fov;
  camera.updateProjectionMatrix();

  if (cameraFovSlider) {
    cameraFovSlider.value = cameraState.fov.toFixed(0);
  }

  if (cameraFovValue) {
    cameraFovValue.value = `${cameraState.fov.toFixed(0)}°`;
    cameraFovValue.textContent = `${cameraState.fov.toFixed(0)}°`;
  }

  if (cameraHeightSlider) {
    cameraHeightSlider.value = cameraState.height.toFixed(2);
  }

  if (cameraHeightValue) {
    cameraHeightValue.value = cameraState.height.toFixed(2);
    cameraHeightValue.textContent = cameraState.height.toFixed(2);
  }

  sceneMetrics.walkY = sceneMetrics.groundY + VIEWER_CONFIG.locomotion.eyeHeight;
  const delta = cameraState.height - cameraState.lastAppliedHeight;
  camera.position.y += delta;

  cameraState.lastAppliedHeight = cameraState.height;
}

function applyCameraMotionSettings() {
  if (cameraShakeToggle) {
    cameraShakeToggle.checked = VIEWER_CONFIG.camera.ambientMotion.enabled;
  }
}

function clearCameraAmbientMotion() {
  if (cameraState.lastOffset.lengthSq() > 0) {
    camera.position.sub(cameraState.lastOffset);
    cameraState.lastOffset.set(0, 0, 0);
  }

  if (cameraState.lastYawOffset !== 0 || cameraState.lastPitchOffset !== 0) {
    camera.rotation.y -= cameraState.lastYawOffset;
    camera.rotation.x -= cameraState.lastPitchOffset;
    cameraState.lastYawOffset = 0;
    cameraState.lastPitchOffset = 0;
  }
}

function applyCameraAmbientMotion(delta) {
  const ambientMotion = VIEWER_CONFIG.camera.ambientMotion;
  if (!ambientMotion?.enabled) {
    return;
  }

  cameraState.ambientMotionTime += delta * ambientMotion.speed;
  const t = cameraState.ambientMotionTime;

  const offsetX = Math.sin(t * 0.83) * ambientMotion.positionX;
  const offsetY = Math.cos(t * 1.11) * ambientMotion.positionY;
  const offsetZ = Math.sin(t * 0.57 + 1.3) * ambientMotion.positionZ;

  camera.position.x += offsetX;
  camera.position.y += offsetY;
  camera.position.z += offsetZ;
  cameraState.lastOffset.set(offsetX, offsetY, offsetZ);

  const yawOffset = THREE.MathUtils.degToRad(ambientMotion.yawDegrees) * Math.sin(t * 0.41 + 0.6);
  const pitchOffset = THREE.MathUtils.degToRad(ambientMotion.pitchDegrees) * Math.cos(t * 0.52 + 1.1);

  camera.rotation.y += yawOffset;
  camera.rotation.x += pitchOffset;
  cameraState.lastYawOffset = yawOffset;
  cameraState.lastPitchOffset = pitchOffset;
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

function formatInteger(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(value || 0));
}

function formatMegabytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function collectMaterialTextures(material, target) {
  const textureKeys = [
    "map",
    "alphaMap",
    "roughnessMap",
    "emissiveMap",
    "metalnessMap",
    "normalMap",
  ];

  textureKeys.forEach((key) => {
    const texture = material?.[key];
    if (texture?.isTexture) {
      target.set(texture.id, texture);
    }
  });
}

function estimateTextureBytes(texture) {
  const image = texture?.image;
  if (!image) {
    return 0;
  }

  const { width, height } = getTextureDimensions(image);
  if (!width || !height) {
    return 0;
  }

  const mipFactor = texture.generateMipmaps ? (4 / 3) : 1;
  return width * height * 4 * mipFactor;
}

function estimateVisibleTextureMemory() {
  const uniqueTextures = new Map();

  diagnosticsState.loadedLayers.forEach((entry) => {
    if (!entry.root.visible) {
      return;
    }

    entry.root.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => collectMaterialTextures(material, uniqueTextures));
    });
  });

  let textureBytes = 0;
  uniqueTextures.forEach((texture) => {
    textureBytes += estimateTextureBytes(texture);
  });

  return {
    count: uniqueTextures.size,
    bytes: textureBytes,
  };
}

function updatePerformanceDiagnostics() {
  const textureUsage = estimateVisibleTextureMemory();
  const renderInfo = renderer.info.render;

  if (statFps) {
    statFps.textContent = formatInteger(diagnosticsState.fps);
  }

  if (statFrameMs) {
    statFrameMs.textContent = `${diagnosticsState.frameMs.toFixed(1)} ms`;
  }

  if (statDrawCalls) {
    statDrawCalls.textContent = formatInteger(renderInfo.calls);
  }

  if (statTriangles) {
    statTriangles.textContent = formatInteger(renderInfo.triangles);
  }

  if (statTextures) {
    statTextures.textContent = formatInteger(textureUsage.count);
  }

  if (statTextureMemory) {
    statTextureMemory.textContent = formatMegabytes(textureUsage.bytes);
  }

  if (performanceNote) {
    const visibleLayerLabels = diagnosticsState.loadedLayers
      .filter((entry) => entry.root.visible)
      .map((entry) => entry.layer.label);
    const deviceMemory = navigator.deviceMemory ? `${navigator.deviceMemory} GB reported RAM` : "device RAM unavailable";
    const mipMode = VIEWER_CONFIG.runtimeOptimization.lowMemoryBaseMipmaps
      ? "Base mipmaps disabled."
      : "Base mipmaps enabled.";
    const textureCap = VIEWER_CONFIG.runtimeOptimization.baseTextureMaxSize
      ? `Base textures capped to ${VIEWER_CONFIG.runtimeOptimization.baseTextureMaxSize}px.`
      : "Base textures uncapped.";
    performanceNote.textContent = `Visible layers: ${visibleLayerLabels.join(", ") || "none"}. Texture VRAM is an approximation. ${mipMode} ${textureCap} ${deviceMemory}.`;
  }
}

function renderLayerControls() {
  if (!layerControls) {
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
    textWrap.innerHTML = `<strong>${entry.layer.label}</strong><small>${entry.layer.id}</small>`;

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
    uiState.relockAfterMenuClose = controls.isLocked && !isTouchDevice;
    controls.unlock();
    keys.clear();
    resetJoystick();
    setTouchMoveY(0);
    setTouchBoost(false);
    updateStatus("Menu open. Scene controls are paused.");
    return;
  }

  if (uiState.relockAfterMenuClose && !isTouchDevice) {
    requestAnimationFrame(() => {
      controls.lock({ ignoreCooldown: true });
    });
  }
}

function setTouchMoveY(value) {
  touchInput.moveY = value;
}

function setTouchBoost(active) {
  touchInput.boost = active;
  boostButton?.classList.toggle("is-active", active);
}

function resetJoystick() {
  touchInput.moveX = 0;
  touchInput.moveZ = 0;
  touchInput.joystickTouchId = null;
  if (joystickThumb) {
    joystickThumb.style.transform = "translate(-50%, -50%) translate(0px, 0px)";
  }
}

function updateJoystickFromTouch(touch) {
  if (!joystickBase || !joystickThumb) {
    return;
  }

  const rect = joystickBase.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const radius = rect.width * 0.35;
  const deltaX = touch.clientX - centerX;
  const deltaY = touch.clientY - centerY;
  const distance = Math.hypot(deltaX, deltaY);
  const clampedDistance = Math.min(distance, radius);
  const angle = Math.atan2(deltaY, deltaX);
  const moveX = Math.cos(angle) * clampedDistance;
  const moveY = Math.sin(angle) * clampedDistance;

  joystickThumb.style.transform = `translate(-50%, -50%) translate(${moveX}px, ${moveY}px)`;
  touchInput.moveX = THREE.MathUtils.clamp(moveX / radius, -1, 1);
  touchInput.moveZ = THREE.MathUtils.clamp(-moveY / radius, -1, 1);
}

function applyLookDelta(deltaX, deltaY) {
  lookState.yaw -= deltaX * lookState.sensitivity;
  lookState.pitch = THREE.MathUtils.clamp(
    lookState.pitch - deltaY * lookState.sensitivity,
    lookState.minPitch,
    lookState.maxPitch,
  );
  applyLookState();
}

function syncLookStateFromCamera() {
  lookState.pitch = camera.rotation.x;
  lookState.yaw = camera.rotation.y;
}

function applyLookState() {
  camera.rotation.order = "YXZ";
  camera.rotation.x = lookState.pitch;
  camera.rotation.y = lookState.yaw;
}

function matchesNameIncludes(name, includes = []) {
  const normalized = `${name ?? ""}`.toLowerCase();
  return includes.some((token) => normalized.includes(token.toLowerCase()));
}

function findMaterialTweak(mesh, sourceMaterial) {
  return VIEWER_CONFIG.materialTweaks.find((tweak) => {
    const materialMatch = matchesNameIncludes(sourceMaterial?.name, tweak.materialNameIncludes);
    const meshMatch = matchesNameIncludes(mesh?.name, tweak.meshNameIncludes);
    return materialMatch || meshMatch;
  }) ?? null;
}

function getUvAttributeName(channel) {
  return channel === 0 ? "uv" : `uv${channel}`;
}

function applyViewerMaterialPatches(material, { tweak = null, alphaFromMapChannel = null } = {}) {
  const hasTweak = Boolean(tweak)
    && (Number.isFinite(tweak.brightness) || Number.isFinite(tweak.saturation));
  const hasSeparateAlphaFromMap = Number.isInteger(alphaFromMapChannel) && alphaFromMapChannel >= 0;

  if (!hasTweak && !hasSeparateAlphaFromMap) {
    return;
  }

  const brightness = hasTweak && Number.isFinite(tweak.brightness) ? tweak.brightness : 1;
  const saturation = hasTweak && Number.isFinite(tweak.saturation) ? tweak.saturation : 1;
  const alphaUvAttributeName = hasSeparateAlphaFromMap
    ? getUvAttributeName(alphaFromMapChannel)
    : null;

  material.onBeforeCompile = (shader) => {
    if (hasTweak) {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
vec3 viewerAdjustSaturation(vec3 color, float saturation) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(luma), color, saturation);
}`,
      );
    }

    if (hasSeparateAlphaFromMap) {
      shader.uniforms.viewerAlphaUvTransform = {
        value: material.map?.matrix ?? new THREE.Matrix3(),
      };

      shader.vertexShader = shader.vertexShader.replace(
        "#include <uv_pars_vertex>",
        `#include <uv_pars_vertex>
attribute vec2 ${alphaUvAttributeName};
varying vec2 vViewerAlphaUv;
uniform mat3 viewerAlphaUvTransform;`,
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
vViewerAlphaUv = ( viewerAlphaUvTransform * vec3( ${alphaUvAttributeName}, 1.0 ) ).xy;`,
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <uv_pars_fragment>",
        `#include <uv_pars_fragment>
varying vec2 vViewerAlphaUv;`,
      );
    }

    let mapFragmentReplacement = "#include <map_fragment>";

    if (hasSeparateAlphaFromMap) {
      mapFragmentReplacement = `#ifdef USE_MAP
vec4 sampledDiffuseColor = texture2D( map, vMapUv );
diffuseColor.rgb *= sampledDiffuseColor.rgb;
diffuseColor.a *= texture2D( map, vViewerAlphaUv ).a;
#endif`;
    }

    if (hasTweak) {
      mapFragmentReplacement += `
diffuseColor.rgb = viewerAdjustSaturation(diffuseColor.rgb, ${saturation.toFixed(3)});
diffuseColor.rgb *= ${brightness.toFixed(3)};`;
    }

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      mapFragmentReplacement,
    );
  };
  material.needsUpdate = true;
}

function applyGlassMaterialPatch(material, {
  centerOpacity,
  edgeOpacity,
  power,
  edgeTintStrength,
} = {}) {
  material.onBeforeCompile = (shader) => {
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
  };

  material.needsUpdate = true;
}

function applyBackgroundMaterialPatch(material) {
  material.onBeforeCompile = (shader) => {
    const backgroundUniforms = {
      viewerBackgroundHue: { value: backgroundState.hueDegrees / 360 },
      viewerBackgroundSaturation: { value: backgroundState.saturation },
      viewerBackgroundValue: { value: backgroundState.value },
    };

    Object.assign(shader.uniforms, backgroundUniforms);
    material.userData.viewerBackgroundUniforms = backgroundUniforms;
    material.userData.viewerBackgroundShader = shader;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
uniform float viewerBackgroundHue;
uniform float viewerBackgroundSaturation;
uniform float viewerBackgroundValue;

vec3 viewerRgbToHsv(vec3 color) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(color.bg, K.wz), vec4(color.gb, K.xy), step(color.b, color.g));
  vec4 q = mix(vec4(p.xyw, color.r), vec4(color.r, p.yzx), step(p.x, color.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 viewerHsvToRgb(vec3 color) {
  vec3 rgb = clamp(abs(mod(color.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return color.z * mix(vec3(1.0), rgb, color.y);
}`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
vec3 viewerBackgroundHsv = viewerRgbToHsv(diffuseColor.rgb);
viewerBackgroundHsv.x = fract(viewerBackgroundHsv.x + viewerBackgroundHue);
viewerBackgroundHsv.y = clamp(viewerBackgroundHsv.y * viewerBackgroundSaturation, 0.0, 2.0);
viewerBackgroundHsv.z = clamp(viewerBackgroundHsv.z * viewerBackgroundValue, 0.0, 2.0);
diffuseColor.rgb = viewerHsvToRgb(viewerBackgroundHsv);`,
    );
  };

  material.onBeforeRender = () => {
    const uniforms = material.userData.viewerBackgroundShader?.uniforms;
    if (!uniforms) {
      return;
    }

    uniforms.viewerBackgroundHue.value = backgroundState.hueDegrees / 360;
    uniforms.viewerBackgroundSaturation.value = backgroundState.saturation;
    uniforms.viewerBackgroundValue.value = backgroundState.value;
  };

  material.needsUpdate = true;
}

function clampSpeed(nextSpeed) {
  movement.baseSpeed = THREE.MathUtils.clamp(nextSpeed, 1, 50);
  updateStatus(`Move speed: ${movement.baseSpeed.toFixed(1)} u/s`);
}

function normalizeTexture(texture) {
  if (!texture) {
    return texture;
  }

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.needsUpdate = true;

  return texture;
}

function normalizeDataTexture(texture) {
  if (!texture) {
    return texture;
  }

  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = false;
  texture.needsUpdate = true;

  return texture;
}

function tuneFoliageTexture(texture) {
  if (!texture) {
    return texture;
  }

  if (VIEWER_CONFIG.materialPresets.foliageDisableMipmaps) {
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
  } else {
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
  }

  texture.anisotropy = Math.min(
    VIEWER_CONFIG.materialPresets.foliageAnisotropy ?? 1,
    maxSupportedAnisotropy || 1,
  );

  if (VIEWER_CONFIG.materialPresets.foliagePremultiplyAlpha) {
    texture.premultiplyAlpha = true;
  }

  texture.needsUpdate = true;
  return texture;
}

function getTextureDimensions(image) {
  if (!image) {
    return { width: 0, height: 0 };
  }

  return {
    width: image.videoWidth || image.naturalWidth || image.width || 0,
    height: image.videoHeight || image.naturalHeight || image.height || 0,
  };
}

function applyTextureSizeCap(texture, maxSize = 0) {
  if (!texture) {
    return texture;
  }

  const sourceImage = texture.userData.viewerOriginalImage || texture.image;
  if (!sourceImage) {
    return texture;
  }

  if (!texture.userData.viewerOriginalImage) {
    texture.userData.viewerOriginalImage = sourceImage;
  }

  const { width, height } = getTextureDimensions(sourceImage);
  if (!width || !height) {
    return texture;
  }

  if (!maxSize || Math.max(width, height) <= maxSize) {
    if (texture.image !== sourceImage) {
      texture.image = sourceImage;
      texture.needsUpdate = true;
    }
    return texture;
  }

  const scale = maxSize / Math.max(width, height);
  const nextWidth = Math.max(1, Math.round(width * scale));
  const nextHeight = Math.max(1, Math.round(height * scale));
  const currentImage = texture.image;
  const currentDimensions = getTextureDimensions(currentImage);
  if (currentImage
    && currentImage !== sourceImage
    && currentDimensions.width === nextWidth
    && currentDimensions.height === nextHeight) {
    return texture;
  }

  const canvas = document.createElement("canvas");
  canvas.width = nextWidth;
  canvas.height = nextHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return texture;
  }

  context.drawImage(sourceImage, 0, 0, nextWidth, nextHeight);
  texture.image = canvas;
  texture.needsUpdate = true;
  return texture;
}

function tuneBakedTexture(texture) {
  if (!texture) {
    return texture;
  }

  applyTextureSizeCap(texture, VIEWER_CONFIG.runtimeOptimization.baseTextureMaxSize);

  if (VIEWER_CONFIG.runtimeOptimization.lowMemoryBaseMipmaps) {
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
  } else {
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
  }

  texture.needsUpdate = true;
  return texture;
}

function tuneBaseLayerEntryTextures(entry) {
  if (entry.layer.id !== "base") {
    return;
  }

  const seenTextures = new Set();
  entry.root.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      ["map", "emissiveMap"].forEach((key) => {
        const texture = material?.[key];
        if (!texture?.isTexture || seenTextures.has(texture.id)) {
          return;
        }

        seenTextures.add(texture.id);
        tuneBakedTexture(texture);
      });
    });
  });
}

function applyRuntimeTextureOptimizations() {
  diagnosticsState.loadedLayers.forEach((entry) => {
    tuneBaseLayerEntryTextures(entry);
  });

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

function getMaterialTexture(source) {
  return normalizeTexture(source.map || source.emissiveMap || null);
}

function getMaterialColorTexture(source) {
  return normalizeTexture(source.map || null);
}

function getMaterialAlphaTexture(source) {
  return normalizeDataTexture(source.alphaMap || source.roughnessMap || null);
}

function getMaterialRoughnessTexture(source) {
  return normalizeDataTexture(source.roughnessMap || null);
}

function getMaterialMetalnessTexture(source) {
  return normalizeDataTexture(source.metalnessMap || null);
}

function getMaterialNormalTexture(source) {
  return normalizeDataTexture(source.normalMap || null);
}

function getMaterialAoTexture(source) {
  return normalizeDataTexture(source.aoMap || null);
}

function buildFallbackReflectionEnvironment() {
  const reflectionEnvironmentScene = new RoomEnvironment();
  const reflectionEnvironmentTarget = reflectionPmremGenerator.fromScene(reflectionEnvironmentScene, 0.04);
  const reflectionEnvironmentMap = reflectionEnvironmentTarget.texture;
  reflectionEnvironmentScene.dispose();
  return reflectionEnvironmentMap;
}

async function ensureReflectionEnvironment() {
  if (reflectionState.envTexture) {
    return reflectionState.envTexture;
  }

  if (!reflectionState.envUrl) {
    reflectionState.envUrl = await resolveOptionalAssetUrl(
      VIEWER_CONFIG.materialPresets.reflectMaterial.searchParam,
      VIEWER_CONFIG.materialPresets.reflectMaterial.candidates,
    );
  }

  if (!reflectionState.envUrl) {
    reflectionState.envTexture = buildFallbackReflectionEnvironment();
    scene.environment = reflectionState.envTexture;
    return reflectionState.envTexture;
  }

  try {
    const equirectTexture = await new THREE.TextureLoader().loadAsync(reflectionState.envUrl);
    equirectTexture.colorSpace = THREE.SRGBColorSpace;
    equirectTexture.mapping = THREE.EquirectangularReflectionMapping;
    equirectTexture.needsUpdate = true;

    const reflectionEnvironmentTarget = reflectionPmremGenerator.fromEquirectangular(equirectTexture);
    equirectTexture.dispose();
    reflectionState.envTexture = reflectionEnvironmentTarget.texture;
    scene.environment = reflectionState.envTexture;
    updateStatus(`Reflection environment loaded from ${reflectionState.envUrl}.`);
    return reflectionState.envTexture;
  } catch (error) {
    console.warn(`Failed to load reflection environment from ${reflectionState.envUrl}.`, error);
    reflectionState.envTexture = buildFallbackReflectionEnvironment();
    scene.environment = reflectionState.envTexture;
    return reflectionState.envTexture;
  }
}

function getMaterialTint(source, hasTexture) {
  return hasTexture
    ? new THREE.Color(0xffffff)
    : (source.color ? source.color.clone() : new THREE.Color(0xffffff));
}

function looksLikeAdditiveFx(mesh, source) {
  const label = `${mesh?.name ?? ""} ${source?.name ?? ""}`.toLowerCase();
  return ["fire", "flame", "glow", "ember"].some((token) => label.includes(token));
}

function matchesFireVideoTarget(mesh, material) {
  const label = `${mesh?.name ?? ""} ${material?.userData?.sourceMaterialName ?? material?.name ?? ""}`.toLowerCase();
  return VIEWER_CONFIG.materialPresets.fireVideo.matchIncludes.some((token) => label.includes(token));
}

function applyFireVideoMaterialPatch(material) {
  const fireVideoPreset = VIEWER_CONFIG.materialPresets.fireVideo;
  const hasAlphaMap = Boolean(material.alphaMap);
  const blackPoint = fireVideoPreset.blackPoint.toFixed(3);
  const whitePoint = fireVideoPreset.whitePoint.toFixed(3);
  const brightnessBoost = fireVideoPreset.brightnessBoost.toFixed(3);

  material.onBeforeCompile = (shader) => {
    const fireUniforms = {
      viewerFireHue: { value: fireState.hueDegrees / 360 },
      viewerFireSaturation: { value: fireState.saturation },
      viewerFireValue: { value: fireState.value },
    };
    Object.assign(shader.uniforms, fireUniforms);
    material.userData.viewerFireUniforms = fireUniforms;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
float viewerFireLuma(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}
uniform float viewerFireHue;
uniform float viewerFireSaturation;
uniform float viewerFireValue;

vec3 viewerFireRgbToHsv(vec3 color) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(color.bg, K.wz), vec4(color.gb, K.xy), step(color.b, color.g));
  vec4 q = mix(vec4(p.xyw, color.r), vec4(color.r, p.yzx), step(p.x, color.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 viewerFireHsvToRgb(vec3 color) {
  vec3 rgb = clamp(abs(mod(color.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return color.z * mix(vec3(1.0), rgb, color.y);
}`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#ifdef USE_MAP
vec4 sampledDiffuseColor = texture2D( map, vMapUv );
float viewerFireMask = smoothstep(${blackPoint}, ${whitePoint}, viewerFireLuma(sampledDiffuseColor.rgb));
vec3 viewerFireHsv = viewerFireRgbToHsv(sampledDiffuseColor.rgb);
viewerFireHsv.x = fract(viewerFireHsv.x + viewerFireHue);
viewerFireHsv.y = clamp(viewerFireHsv.y * viewerFireSaturation, 0.0, 2.0);
viewerFireHsv.z = clamp(viewerFireHsv.z * viewerFireValue, 0.0, 2.0);
vec3 viewerFireColor = viewerFireHsvToRgb(viewerFireHsv);
diffuseColor.rgb *= viewerFireColor * ${brightnessBoost};
diffuseColor.a *= viewerFireMask;
#endif`,
    );

    if (hasAlphaMap) {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <alphamap_fragment>",
        `#ifdef USE_ALPHAMAP
diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,
      );
    }
  };

  fireState.materials.add(material);
  material.needsUpdate = true;
}

function stampViewerMaterialData(material, source, tweak) {
  material.toneMapped = true;
  material.userData.sourceMaterialName = source.name || "";
  material.userData.viewerTweakId = tweak?.id || null;
}

function applyTextureChannelOverride(texture, fallbackChannel) {
  if (!texture || !Number.isInteger(fallbackChannel) || fallbackChannel < 0) {
    return texture;
  }

  texture.channel = fallbackChannel;
  texture.needsUpdate = true;

  return texture;
}

function getUvChannelAvailability(mesh) {
  return {
    uv: Boolean(mesh.geometry?.getAttribute("uv")),
    uv1: Boolean(mesh.geometry?.getAttribute("uv1")),
    uv2: Boolean(mesh.geometry?.getAttribute("uv2")),
    uv3: Boolean(mesh.geometry?.getAttribute("uv3")),
  };
}

function getFallbackTextureChannel(mesh, preferredChannel) {
  const availability = getUvChannelAvailability(mesh);
  const preferredAttributeName = preferredChannel === 0
    ? "uv"
    : `uv${preferredChannel}`;

  if (availability[preferredAttributeName]) {
    return preferredChannel;
  }

  if (availability.uv) {
    return 0;
  }

  return null;
}

function makeBakedMaterial(sourceMaterial, mesh) {
  const source = sourceMaterial ?? {};
  const map = getMaterialTexture(source);
  const hasTexture = Boolean(map);
  const hasEmissiveMap = Boolean(source.emissiveMap);
  const tintColor = getMaterialTint(source, hasTexture);
  const tweak = findMaterialTweak(mesh, source);

  tuneBakedTexture(map);

  const material = new THREE.MeshBasicMaterial({
    name: source.name || "BakedMaterial",
    map,
    color: tintColor,
    transparent: Boolean(source.transparent),
    opacity: source.opacity ?? 1,
    alphaTest: source.alphaTest ?? 0,
    side: source.side ?? (hasEmissiveMap ? THREE.DoubleSide : THREE.FrontSide),
    vertexColors: Boolean(source.vertexColors),
  });

  stampViewerMaterialData(material, source, tweak);
  applyViewerMaterialPatches(material, { tweak });

  return material;
}

function makeAlphaCutoutMaterial(sourceMaterial, mesh) {
  const source = sourceMaterial ?? {};
  const map = getMaterialTexture(source);
  const alphaMap = getMaterialAlphaTexture(source);
  const hasTexture = Boolean(map);
  const tweak = findMaterialTweak(mesh, source);
  const colorChannel = getFallbackTextureChannel(
    mesh,
    VIEWER_CONFIG.materialPresets.alphaCutoutUvChannels.color,
  );
  const alphaChannel = getFallbackTextureChannel(
    mesh,
    VIEWER_CONFIG.materialPresets.alphaCutoutUvChannels.alpha,
  );
  const useSeparateAlphaFromMap = !alphaMap
    && Boolean(map)
    && colorChannel !== null
    && alphaChannel !== null
    && colorChannel !== alphaChannel
    && VIEWER_CONFIG.materialPresets.useFallbackMapAlphaFromSeparateUv;

  applyTextureChannelOverride(map, colorChannel);
  applyTextureChannelOverride(alphaMap, alphaChannel);
  tuneFoliageTexture(map);
  tuneFoliageTexture(alphaMap);

  const material = new THREE.MeshBasicMaterial({
    name: source.name || "AlphaCutoutMaterial",
    map,
    alphaMap,
    color: getMaterialTint(source, hasTexture),
    transparent: false,
    opacity: source.opacity ?? 1,
    alphaTest: source.alphaTest || VIEWER_CONFIG.materialPresets.alphaCutoff,
    side: THREE.DoubleSide,
    vertexColors: Boolean(source.vertexColors),
  });
  material.alphaToCoverage = true;
  material.premultipliedAlpha = VIEWER_CONFIG.materialPresets.foliagePremultiplyAlpha;

  stampViewerMaterialData(material, source, tweak);
  material.userData.viewerUvChannels = {
    color: map?.channel ?? null,
    alpha: alphaMap?.channel ?? alphaChannel ?? null,
    alphaSource: source.alphaMap
      ? "alphaMap"
      : (source.roughnessMap ? "roughnessMap" : (useSeparateAlphaFromMap ? "mapAlpha" : "none")),
  };
  applyViewerMaterialPatches(material, {
    tweak,
    alphaFromMapChannel: useSeparateAlphaFromMap ? alphaChannel : null,
  });

  return material;
}

function makeGlassMaterial(sourceMaterial, mesh) {
  const source = sourceMaterial ?? {};
  const map = getMaterialTexture(source);
  const hasTexture = Boolean(map);
  const tweak = findMaterialTweak(mesh, source);
  const opacityScale = source.transparent
    ? (source.opacity ?? 1)
    : 1;
  const fresnelPreset = VIEWER_CONFIG.materialPresets.glassFresnel;
  const material = new THREE.MeshBasicMaterial({
    name: source.name || "GlassMaterial",
    map,
    color: getMaterialTint(source, hasTexture),
    transparent: true,
    opacity: 1,
    alphaTest: source.alphaTest || VIEWER_CONFIG.materialPresets.glassAlphaCutoff,
    side: THREE.DoubleSide,
    depthWrite: false,
    vertexColors: Boolean(source.vertexColors),
  });

  stampViewerMaterialData(material, source, tweak);
  applyGlassMaterialPatch(material, {
    centerOpacity: Math.min(fresnelPreset.centerOpacity * opacityScale, 1),
    edgeOpacity: Math.min(fresnelPreset.edgeOpacity * opacityScale, 1),
    power: fresnelPreset.power,
    edgeTintStrength: fresnelPreset.edgeTintStrength,
  });

  return material;
}

function makeReflectMaterial(sourceMaterial, mesh) {
  const source = sourceMaterial ?? {};
  const map = getMaterialColorTexture(source);
  const roughnessMap = getMaterialRoughnessTexture(source);
  const metalnessMap = getMaterialMetalnessTexture(source);
  const normalMap = getMaterialNormalTexture(source);
  const aoMap = getMaterialAoTexture(source);
  const hasTexture = Boolean(map);
  const tweak = findMaterialTweak(mesh, source);
  const reflectUvChannels = VIEWER_CONFIG.materialPresets.reflectUvChannels;
  const colorChannel = getFallbackTextureChannel(mesh, reflectUvChannels.color);
  const roughnessChannel = getFallbackTextureChannel(mesh, reflectUvChannels.roughness);
  const metalnessChannel = getFallbackTextureChannel(mesh, reflectUvChannels.metalness);
  const aoChannel = getFallbackTextureChannel(mesh, reflectUvChannels.ao);
  const normalChannel = getFallbackTextureChannel(mesh, reflectUvChannels.normal);
  const reflectPreset = VIEWER_CONFIG.materialPresets.reflectMaterial;

  applyTextureChannelOverride(map, colorChannel);
  applyTextureChannelOverride(roughnessMap, roughnessChannel);
  applyTextureChannelOverride(metalnessMap, metalnessChannel);
  applyTextureChannelOverride(aoMap, aoChannel);
  applyTextureChannelOverride(normalMap, normalChannel);

  const material = new THREE.MeshPhysicalMaterial({
    name: source.name || "ReflectMaterial",
    map,
    color: getMaterialTint(source, hasTexture),
    roughness: source.roughness ?? reflectPreset.defaultRoughness,
    roughnessMap,
    metalness: reflectionState.metalness,
    metalnessMap,
    normalMap,
    normalScale: source.normalScale?.clone?.() ?? new THREE.Vector2(1, 1),
    aoMap,
    envMapIntensity: reflectionState.envMapIntensity,
    transparent: Boolean(source.transparent),
    opacity: source.opacity ?? 1,
    alphaTest: source.alphaTest ?? 0,
    side: source.side ?? THREE.FrontSide,
    vertexColors: Boolean(source.vertexColors),
    emissive: source.emissive?.clone?.() ?? new THREE.Color(0x000000),
    emissiveMap: normalizeTexture(source.emissiveMap || null),
    emissiveIntensity: source.emissiveIntensity ?? 1,
    ior: reflectionState.ior,
    specularIntensity: reflectionState.specularIntensity,
    clearcoat: source.clearcoat ?? 0,
    clearcoatRoughness: source.clearcoatRoughness ?? 0,
    transmission: source.transmission ?? 0,
    thickness: source.thickness ?? 0,
  });

  material.envMap = reflectionState.envTexture ?? scene.environment ?? null;

  stampViewerMaterialData(material, source, tweak);
  material.userData.viewerUvChannels = {
    color: map?.channel ?? colorChannel ?? null,
    roughness: roughnessMap?.channel ?? roughnessChannel ?? null,
    metalness: metalnessMap?.channel ?? metalnessChannel ?? null,
    ao: aoMap?.channel ?? aoChannel ?? null,
    normal: normalMap?.channel ?? normalChannel ?? null,
  };
  applyViewerMaterialPatches(material, { tweak });
  reflectionState.materials.add(material);

  return material;
}

function makeBackgroundMaterial(sourceMaterial, mesh) {
  const source = sourceMaterial ?? {};
  const map = getMaterialTexture(source);
  const hasTexture = Boolean(map);
  const tint = getMaterialTint(source, hasTexture);
  const backgroundUniforms = {
    viewerBackgroundMap: { value: map },
    viewerBackgroundTint: { value: tint },
    viewerBackgroundOpacity: { value: source.opacity ?? 1 },
    viewerBackgroundHue: { value: backgroundState.hueDegrees / 360 },
    viewerBackgroundSaturation: { value: backgroundState.saturation },
    viewerBackgroundValue: { value: backgroundState.value },
    viewerBackgroundTime: { value: backgroundState.motionTime },
    viewerBackgroundWarpStrength: { value: VIEWER_CONFIG.materialPresets.background.warpStrength },
    viewerBackgroundWarpScale: { value: VIEWER_CONFIG.materialPresets.background.warpScale },
    viewerBackgroundWarpSpeed: { value: VIEWER_CONFIG.materialPresets.background.warpSpeed },
    viewerBackgroundShimmerStrength: { value: VIEWER_CONFIG.materialPresets.background.shimmerStrength },
    viewerBackgroundShimmerSpeed: { value: VIEWER_CONFIG.materialPresets.background.shimmerSpeed },
  };

  const material = new THREE.ShaderMaterial({
    name: source.name || "BackgroundMaterial",
    uniforms: backgroundUniforms,
    vertexShader: `
varying vec2 vViewerUv;

void main() {
  vViewerUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `
uniform sampler2D viewerBackgroundMap;
uniform vec3 viewerBackgroundTint;
uniform float viewerBackgroundOpacity;
uniform float viewerBackgroundHue;
uniform float viewerBackgroundSaturation;
uniform float viewerBackgroundValue;
uniform float viewerBackgroundTime;
uniform float viewerBackgroundWarpStrength;
uniform float viewerBackgroundWarpScale;
uniform float viewerBackgroundWarpSpeed;
uniform float viewerBackgroundShimmerStrength;
uniform float viewerBackgroundShimmerSpeed;
varying vec2 vViewerUv;

vec3 viewerRgbToHsv(vec3 color) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(color.bg, K.wz), vec4(color.gb, K.xy), step(color.b, color.g));
  vec4 q = mix(vec4(p.xyw, color.r), vec4(color.r, p.yzx), step(p.x, color.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 viewerHsvToRgb(vec3 color) {
  vec3 rgb = clamp(abs(mod(color.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return color.z * mix(vec3(1.0), rgb, color.y);
}

void main() {
  float warpTime = viewerBackgroundTime * viewerBackgroundWarpSpeed;
  vec2 warpedUv = vViewerUv;
  vec2 warp = vec2(
    sin((warpedUv.y * 1.7 + warpedUv.x * 0.35) * viewerBackgroundWarpScale + warpTime * 1.13)
      + cos((warpedUv.y * 0.8 - warpedUv.x * 0.55) * viewerBackgroundWarpScale - warpTime * 0.87),
    cos((warpedUv.x * 1.35 - warpedUv.y * 0.25) * viewerBackgroundWarpScale - warpTime * 0.91)
      + sin((warpedUv.x * 0.65 + warpedUv.y * 0.45) * viewerBackgroundWarpScale + warpTime * 1.29)
  );
  warpedUv += warp * (viewerBackgroundWarpStrength * 0.5);
  warpedUv = clamp(warpedUv, vec2(0.001), vec2(0.999));

  vec4 sampled = texture2D(viewerBackgroundMap, warpedUv);
  vec3 color = sampled.rgb * viewerBackgroundTint;
  vec3 hsv = viewerRgbToHsv(color);
  hsv.x = fract(hsv.x + viewerBackgroundHue);
  hsv.y = clamp(hsv.y * viewerBackgroundSaturation, 0.0, 2.0);
  float shimmer = 1.0 + sin(
    (warpedUv.x + warpedUv.y * 1.4) * (viewerBackgroundWarpScale * 0.55)
    + viewerBackgroundTime * viewerBackgroundShimmerSpeed
  ) * viewerBackgroundShimmerStrength;
  hsv.z = clamp(hsv.z * viewerBackgroundValue * shimmer, 0.0, 2.0);
  gl_FragColor = vec4(viewerHsvToRgb(hsv), sampled.a * viewerBackgroundOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
    side: THREE.DoubleSide,
    transparent: Boolean(source.transparent) || (source.opacity ?? 1) < 1,
    depthWrite: false,
    fog: false,
  });

  material.toneMapped = true;
  material.userData.sourceMaterialName = source.name || "";
  material.userData.viewerTweakId = null;
  material.userData.viewerBackgroundUniforms = backgroundUniforms;
  material.uniformsNeedUpdate = true;
  backgroundState.materials.add(material);

  return material;
}

function makeUnlitAlphaMaterial(sourceMaterial, mesh) {
  const source = sourceMaterial ?? {};
  const map = getMaterialTexture(source);
  const alphaMap = getMaterialAlphaTexture(source);
  const hasTexture = Boolean(map);

  const material = new THREE.MeshBasicMaterial({
    name: source.name || "UnlitAlphaMaterial",
    map,
    alphaMap,
    color: getMaterialTint(source, hasTexture),
    transparent: true,
    opacity: source.opacity ?? 1,
    alphaTest: source.alphaTest ?? 0,
    side: source.side ?? THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.NormalBlending,
    vertexColors: Boolean(source.vertexColors),
    fog: false,
  });

  material.toneMapped = false;
  material.userData.sourceMaterialName = source.name || "";
  material.userData.viewerTweakId = null;

  return material;
}

function makeFxMaterial(sourceMaterial, mesh) {
  const source = sourceMaterial ?? {};
  const map = getMaterialTexture(source);
  const alphaMap = getMaterialAlphaTexture(source);
  const hasTexture = Boolean(map);
  const tweak = findMaterialTweak(mesh, source);
  const colorChannel = getFallbackTextureChannel(
    mesh,
    VIEWER_CONFIG.materialPresets.fxUvChannels.color,
  );
  const alphaChannel = getFallbackTextureChannel(
    mesh,
    VIEWER_CONFIG.materialPresets.fxUvChannels.alpha,
  );

  applyTextureChannelOverride(map, colorChannel);
  applyTextureChannelOverride(alphaMap, alphaChannel);
  const material = new THREE.MeshBasicMaterial({
    name: source.name || "FxMaterial",
    map,
    alphaMap,
    color: getMaterialTint(source, hasTexture),
    transparent: true,
    opacity: source.opacity ?? 1,
    alphaTest: source.alphaTest || VIEWER_CONFIG.materialPresets.fxAlphaCutoff,
    side: source.side ?? THREE.DoubleSide,
    depthWrite: false,
    blending: looksLikeAdditiveFx(mesh, source) ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexColors: Boolean(source.vertexColors),
  });

  stampViewerMaterialData(material, source, tweak);
  applyViewerMaterialPatches(material, { tweak });

  return material;
}

function makeViewerMaterial(sourceMaterial, mesh, materialMode) {
  switch (materialMode) {
    case "background":
      return makeBackgroundMaterial(sourceMaterial, mesh);
    case "unlitAlpha":
      return makeUnlitAlphaMaterial(sourceMaterial, mesh);
    case "alphaCutout":
      return makeAlphaCutoutMaterial(sourceMaterial, mesh);
    case "glass":
      return makeGlassMaterial(sourceMaterial, mesh);
    case "reflect":
      return makeReflectMaterial(sourceMaterial, mesh);
    case "fx":
      return makeFxMaterial(sourceMaterial, mesh);
    case "baked":
    default:
      return makeBakedMaterial(sourceMaterial, mesh);
  }
}

function convertMeshForLayer(mesh, materialMode) {
  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map((material) => makeViewerMaterial(material, mesh, materialMode));
  } else {
    mesh.material = makeViewerMaterial(mesh.material, mesh, materialMode);
  }

  mesh.castShadow = false;
  mesh.receiveShadow = false;
  if (mesh.geometry && !mesh.geometry.boundingSphere) {
    mesh.geometry.computeBoundingSphere();
  }
  mesh.frustumCulled = !["background", "unlitAlpha"].includes(materialMode)
    && VIEWER_CONFIG.runtimeOptimization.frustumCulling;

  if (materialMode === "background") {
    mesh.onBeforeRender = (_renderer, _scene, _camera, _geometry, renderMaterial) => {
      const uniforms = renderMaterial?.userData?.viewerBackgroundShader?.uniforms;
      if (!uniforms) {
        return;
      }

      uniforms.viewerBackgroundHue.value = backgroundState.hueDegrees / 360;
      uniforms.viewerBackgroundSaturation.value = backgroundState.saturation;
      uniforms.viewerBackgroundValue.value = backgroundState.value;
    };
    mesh.renderOrder = -1000;
    return;
  }

  if (materialMode === "unlitAlpha") {
    mesh.renderOrder = -900;
  }
}

function isGameplayMesh(mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return !materials.some((material) => {
    const tweakId = material?.userData?.viewerTweakId;
    const tweak = VIEWER_CONFIG.materialTweaks.find((entry) => entry.id === tweakId);
    return tweak?.excludeFromGameplayBounds;
  });
}

function computeSceneMetrics(root) {
  let hasGameplayBounds = false;

  sceneMetrics.bounds.makeEmpty();

  root.traverse((child) => {
    if (!child.isMesh || !isGameplayMesh(child)) {
      return;
    }

    tmpBox.setFromObject(child);
    if (tmpBox.isEmpty()) {
      return;
    }

    if (!hasGameplayBounds) {
      sceneMetrics.bounds.copy(tmpBox);
      hasGameplayBounds = true;
      return;
    }

    sceneMetrics.bounds.union(tmpBox);
  });

  if (!hasGameplayBounds) {
    sceneMetrics.bounds.setFromObject(root);
  }

  if (sceneMetrics.bounds.isEmpty()) {
    return;
  }

  sceneMetrics.bounds.getSize(sceneMetrics.size);
  sceneMetrics.bounds.getCenter(sceneMetrics.center);
  sceneMetrics.groundY = VIEWER_CONFIG.locomotion.fixedFloorY;
  sceneMetrics.walkY = sceneMetrics.groundY + VIEWER_CONFIG.locomotion.eyeHeight;
}

function positionCameraAtSpawn(root) {
  computeSceneMetrics(root);
  if (sceneMetrics.bounds.isEmpty()) {
    return;
  }

  if (VIEWER_CONFIG.locomotion.startPosition) {
    const startY = isWalkMode
      ? VIEWER_CONFIG.locomotion.startPosition.y + VIEWER_CONFIG.locomotion.eyeHeight
      : VIEWER_CONFIG.locomotion.startPosition.y;

    camera.position.set(
      VIEWER_CONFIG.locomotion.startPosition.x,
      startY,
      VIEWER_CONFIG.locomotion.startPosition.z,
    );
  } else if (isWalkMode) {
    camera.position.set(
      sceneMetrics.center.x,
      sceneMetrics.walkY,
      sceneMetrics.center.z,
    );
  } else {
    const distance = Math.max(sceneMetrics.size.x, sceneMetrics.size.y, sceneMetrics.size.z) || 1;
    camera.position.set(
      sceneMetrics.center.x,
      sceneMetrics.center.y + Math.max(sceneMetrics.size.y * 0.1, 1.7),
      sceneMetrics.center.z + distance * 0.4,
    );
  }

  if (VIEWER_CONFIG.locomotion.startLookAt) {
    camera.lookAt(
      VIEWER_CONFIG.locomotion.startLookAt.x,
      VIEWER_CONFIG.locomotion.startLookAt.y,
      VIEWER_CONFIG.locomotion.startLookAt.z,
    );
    syncLookStateFromCamera();
  } else if (!isWalkMode) {
    camera.lookAt(sceneMetrics.center);
    syncLookStateFromCamera();
  } else {
    lookState.yaw = THREE.MathUtils.degToRad(VIEWER_CONFIG.locomotion.startYawDegrees ?? 0);
    lookState.pitch = THREE.MathUtils.degToRad(VIEWER_CONFIG.locomotion.startPitchDegrees ?? 0);
    applyLookState();
  }

  controls.unlock();
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

  updateStatus("No GLTF found yet. Placeholder room loaded. Drop your file into /public/assets/scene/.");
  setLoadingScreenVisible(false);
}

async function findFirstReachableScene(candidates = []) {
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { method: "HEAD" });
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      const looksLikeHtmlFallback = contentType.includes("text/html");
      if (response.ok && !looksLikeHtmlFallback) {
        return candidate;
      }
    } catch (error) {
      console.warn(`Scene probe failed for ${candidate}.`, error);
    }
  }

  return null;
}

async function resolveOptionalAssetUrl(searchParam, candidates = []) {
  const directUrl = searchParams.get(searchParam);
  if (directUrl) {
    return directUrl;
  }

  return findFirstReachableScene(candidates);
}

async function ensureFireVideoTexture() {
  if (fxState.videoTexture) {
    return fxState.videoTexture;
  }

  if (!fxState.videoUrl) {
    fxState.videoUrl = await resolveOptionalAssetUrl(
      VIEWER_CONFIG.materialPresets.fireVideo.searchParam,
      VIEWER_CONFIG.materialPresets.fireVideo.candidates,
    );
  }

  if (!fxState.videoUrl) {
    return null;
  }

  const video = document.createElement("video");
  video.src = fxState.videoUrl;
  video.crossOrigin = "anonymous";
  video.loop = true;
  video.autoplay = true;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.setAttribute("autoplay", "");
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");

  await new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadeddata", handleLoaded);
      video.removeEventListener("error", handleError);
    };
    const handleLoaded = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error(`Failed to load fire video from ${fxState.videoUrl}.`));
    };

    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("error", handleError);
    video.load();
  });

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  fxState.videoElement = video;
  fxState.videoTexture = texture;

  try {
    await video.play();
  } catch {
    // Autoplay can be blocked until a user gesture; we'll retry on click/lock.
  }

  return texture;
}

async function applyFxRuntimeAssets(root) {
  const fireVideoTexture = await ensureFireVideoTexture();
  if (!fireVideoTexture) {
    return 0;
  }

  let patchedMaterials = 0;
  root.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material?.isMaterial || !matchesFireVideoTarget(child, material)) {
        return;
      }

      const colorChannel = getFallbackTextureChannel(
        child,
        VIEWER_CONFIG.materialPresets.fxUvChannels.color,
      );

      material.map = fireVideoTexture;
      applyTextureChannelOverride(material.map, colorChannel);
      material.transparent = true;
      material.alphaTest = Math.min(material.alphaTest || VIEWER_CONFIG.materialPresets.fxAlphaCutoff, 0.02);
      applyFireVideoMaterialPatch(material);
      material.needsUpdate = true;
      patchedMaterials += 1;
    });
  });

  return patchedMaterials;
}

function resumeFireVideoPlayback() {
  if (!fxState.videoElement || !fxState.videoElement.paused) {
    return;
  }

  fxState.lastResumeAttemptAt = performance.now();
  fxState.videoElement.play().catch(() => {
    // Ignore user-gesture playback failures.
  });
}

async function resolveSceneLayers() {
  const resolvedLayers = [];

  for (const layer of VIEWER_CONFIG.sceneLayers) {
    const directUrl = searchParams.get(layer.searchParam ?? layer.id);
    const url = directUrl || await findFirstReachableScene(layer.candidates);
    if (!url) {
      if (layer.required) {
        return null;
      }
      continue;
    }

    resolvedLayers.push({
      ...layer,
      url,
    });
  }

  return resolvedLayers;
}

function logLayerMaterials(root, layer) {
  if (!VIEWER_CONFIG.debug.logMaterialTargets) {
    return;
  }

  const rows = [];
  root.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      rows.push({
        layer: layer.id,
        mesh: child.name || "(unnamed mesh)",
        material: material?.name || "(unnamed material)",
        tweak: material?.userData?.viewerTweakId || "",
      });
    });
  });
  console.table(rows);
}

async function loadSceneLayers() {
  try {
    await ensureReflectionEnvironment();
    const layers = await resolveSceneLayers();
    if (!layers?.length) {
      addFallbackScene();
      return;
    }

    const loadedLayers = [];
    for (const layer of layers) {
      try {
        updateStatus(`Loading ${layer.label} layer from ${layer.url}...`);
        const gltf = await loader.loadAsync(layer.url);
        const root = gltf.scene;
        root.name = root.name || `${layer.id}-root`;
        root.userData.viewerLayerId = layer.id;

        root.traverse((child) => {
          if (child.isMesh) {
            convertMeshForLayer(child, layer.materialMode);
          }
        });

        if (layer.id === "fx") {
          await applyFxRuntimeAssets(root);
        }

        if (layer.id === "background") {
          backgroundState.roots.add(root);
        }

        logLayerMaterials(root, layer);
        sceneRoots.add(root);
        loadedLayers.push({ layer, root });
      } catch (error) {
        if (layer.required) {
          throw error;
        }

        console.warn(`Optional layer "${layer.id}" failed to load from ${layer.url}.`, error);
      }
    }

    if (!loadedLayers.length) {
      addFallbackScene();
      return;
    }

    diagnosticsState.loadedLayers = loadedLayers;
    renderLayerControls();
    applyBackgroundColorSettings();
    applyFireColorSettings();
    applyReflectMaterialSettings();
    applyRuntimeTextureOptimizations();
    updatePerformanceDiagnostics();

    const spawnRoot = loadedLayers.find((entry) => entry.layer.id === "base")?.root ?? loadedLayers[0].root;
    positionCameraAtSpawn(spawnRoot);
    applyCameraSettings();

    const loadedSummary = loadedLayers.map((entry) => entry.layer.label).join(", ");
    updateStatus(isTouchDevice
      ? `Loaded layers: ${loadedSummary}. Use joystick and look pad to ${isWalkMode ? "walk" : "fly"}.`
      : `Loaded layers: ${loadedSummary}. Click to lock mouse and ${isWalkMode ? "walk" : "fly"}.`);
    setLoadingScreenVisible(false);
  } catch (error) {
    console.error(error);
    addFallbackScene();
    updateStatus("Scene load failed. Check browser console and your exported asset paths.");
    setLoadingScreenVisible(false);
  }
}

window.addEventListener("keydown", (event) => {
  resumeFireVideoPlayback();

  if (event.code === "KeyM") {
    event.preventDefault();
    setMenuOpen(!uiState.menuOpen);
    return;
  }

  if (event.code === "Escape" && uiState.menuOpen) {
    event.preventDefault();
    setMenuOpen(false);
    return;
  }

  if (uiState.menuOpen) {
    return;
  }

  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

document.addEventListener("pointerlockchange", () => {
  if (!controls.isLocked) {
    pointerLockState.lastUnlockAt = performance.now();
  }
});

if (!isTouchDevice) {
  viewport.addEventListener("click", (event) => {
    if (event.target.closest(".hud")) {
      return;
    }

    resumeFireVideoPlayback();
    controls.lock();
  });
}

window.addEventListener("mousemove", (event) => {
  if (!controls.isLocked || uiState.menuOpen) {
    return;
  }

  applyLookDelta(event.movementX, event.movementY);
});

window.addEventListener("focus", () => {
  resumeFireVideoPlayback();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    resumeFireVideoPlayback();
  }
});

if (isTouchDevice) {
  viewport.classList.add("is-touch");
  applyInterfaceSettings();

  joystickBase?.addEventListener("touchstart", (event) => {
    const [touch] = event.changedTouches;
    if (!touch || touchInput.joystickTouchId !== null) {
      return;
    }

    touchInput.joystickTouchId = touch.identifier;
    updateJoystickFromTouch(touch);
    event.preventDefault();
  }, { passive: false });

  joystickBase?.addEventListener("touchmove", (event) => {
    const touch = [...event.changedTouches].find((item) => item.identifier === touchInput.joystickTouchId);
    if (!touch) {
      return;
    }

    updateJoystickFromTouch(touch);
    event.preventDefault();
  }, { passive: false });

  const releaseJoystick = (event) => {
    const touch = [...event.changedTouches].find((item) => item.identifier === touchInput.joystickTouchId);
    if (!touch) {
      return;
    }

    resetJoystick();
    event.preventDefault();
  };

  joystickBase?.addEventListener("touchend", releaseJoystick, { passive: false });
  joystickBase?.addEventListener("touchcancel", releaseJoystick, { passive: false });

  lookPad?.addEventListener("touchstart", (event) => {
    const [touch] = event.changedTouches;
    if (!touch || touchInput.lookTouchId !== null) {
      return;
    }

    touchInput.lookTouchId = touch.identifier;
    touchInput.lastLookX = touch.clientX;
    touchInput.lastLookY = touch.clientY;
    event.preventDefault();
  }, { passive: false });

  lookPad?.addEventListener("touchmove", (event) => {
    const touch = [...event.changedTouches].find((item) => item.identifier === touchInput.lookTouchId);
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - touchInput.lastLookX;
    const deltaY = touch.clientY - touchInput.lastLookY;
    touchInput.lastLookX = touch.clientX;
    touchInput.lastLookY = touch.clientY;
    applyLookDelta(deltaX, deltaY);
    event.preventDefault();
  }, { passive: false });

  const releaseLook = (event) => {
    const touch = [...event.changedTouches].find((item) => item.identifier === touchInput.lookTouchId);
    if (!touch) {
      return;
    }

    touchInput.lookTouchId = null;
    touchInput.lastLookX = 0;
    touchInput.lastLookY = 0;
    event.preventDefault();
  };

  lookPad?.addEventListener("touchend", releaseLook, { passive: false });
  lookPad?.addEventListener("touchcancel", releaseLook, { passive: false });

  const bindHoldButton = (element, onStart, onEnd) => {
    if (!element) {
      return;
    }

    const start = (event) => {
      onStart();
      element.classList.add("is-active");
      event.preventDefault();
    };
    const end = (event) => {
      onEnd();
      element.classList.remove("is-active");
      event.preventDefault();
    };

    element.addEventListener("touchstart", start, { passive: false });
    element.addEventListener("touchend", end, { passive: false });
    element.addEventListener("touchcancel", end, { passive: false });
  };

  bindHoldButton(flyUpButton, () => setTouchMoveY(1), () => setTouchMoveY(0));
  bindHoldButton(flyDownButton, () => setTouchMoveY(-1), () => setTouchMoveY(0));
  bindHoldButton(boostButton, () => setTouchBoost(true), () => setTouchBoost(false));
}

toneMappingSelect?.addEventListener("change", (event) => {
  VIEWER_CONFIG.colorPipeline.toneMapping = event.target.value;
  applyViewportColorSettings();
});

exposureSlider?.addEventListener("input", (event) => {
  VIEWER_CONFIG.colorPipeline.exposure = Number(event.target.value);
  applyViewportColorSettings();
});

cameraFovSlider?.addEventListener("input", (event) => {
  cameraState.fov = Number(event.target.value);
  applyCameraSettings();
});

cameraHeightSlider?.addEventListener("input", (event) => {
  cameraState.height = Number(event.target.value);
  applyCameraSettings();
});

showCrosshairToggle?.addEventListener("change", (event) => {
  VIEWER_CONFIG.interface.showCrosshair = Boolean(event.target.checked);
  applyInterfaceSettings();
});

cameraShakeToggle?.addEventListener("change", (event) => {
  VIEWER_CONFIG.camera.ambientMotion.enabled = Boolean(event.target.checked);
  clearCameraAmbientMotion();
  applyLookState();
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

window.addEventListener(
  "wheel",
  (event) => {
    if (uiState.menuOpen) {
      return;
    }

    const delta = event.deltaY > 0 ? -0.75 : 0.75;
    clampSpeed(movement.baseSpeed + delta);
  },
  { passive: true },
);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updateMovement(delta) {
  if (uiState.menuOpen) {
    return;
  }

  const canMove = controls.isLocked || isTouchDevice;
  if (!canMove) {
    return;
  }

  velocity.set(0, 0, 0);
  const isBoosting = keys.has("ShiftLeft") || keys.has("ShiftRight") || touchInput.boost;
  const currentSpeed = isBoosting
    ? movement.baseSpeed * movement.boostMultiplier
    : movement.baseSpeed;

  if (keys.has("KeyW")) velocity.z += 1;
  if (keys.has("KeyS")) velocity.z -= 1;
  if (keys.has("KeyA")) velocity.x -= 1;
  if (keys.has("KeyD")) velocity.x += 1;
  if (keys.has("Space")) velocity.y += 1;
  if (keys.has("KeyC")) velocity.y -= 1;

  velocity.x += touchInput.moveX;
  velocity.y += touchInput.moveY;
  velocity.z += touchInput.moveZ;

  if (isWalkMode) {
    velocity.y = 0;
  }

  if (velocity.lengthSq() === 0) {
    return;
  }

  velocity.normalize();

  if (isWalkMode) {
    tmpForward.set(-Math.sin(lookState.yaw), 0, -Math.cos(lookState.yaw));
    tmpRight.set(Math.cos(lookState.yaw), 0, -Math.sin(lookState.yaw));
  } else {
    tmpForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    tmpRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
  }
  tmpUp.set(0, 1, 0);

  camera.position
    .addScaledVector(tmpForward, velocity.z * currentSpeed * delta)
    .addScaledVector(tmpRight, velocity.x * currentSpeed * delta)
    .addScaledVector(tmpUp, velocity.y * currentSpeed * delta);
}

function animate() {
  const delta = clock.getDelta();
  clearCameraAmbientMotion();
  if (fxState.videoElement?.paused && performance.now() - fxState.lastResumeAttemptAt > 1500) {
    resumeFireVideoPlayback();
  }
  updateBackgroundMotion(delta);
  updateMovement(delta);
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

syncLookStateFromCamera();
applyViewportColorSettings();
applyCameraSettings();
applyCameraMotionSettings();
applyInterfaceSettings();
applyBackgroundColorSettings();
applyFireColorSettings();
applyReflectMaterialSettings();
loadSceneLayers();
animate();

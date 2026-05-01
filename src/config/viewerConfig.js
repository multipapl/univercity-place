const DEFAULT_SCENE_ASSET_BASE_URL = "/assets/scene";

function normalizeSceneAssetBaseUrl(value) {
  if (typeof value !== "string") {
    return DEFAULT_SCENE_ASSET_BASE_URL;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_SCENE_ASSET_BASE_URL;
  }

  return trimmed.replace(/\/+$/, "");
}

function buildSceneAssetUrl(filename) {
  const normalizedFilename = filename.replace(/^\/+/, "");
  return `${SCENE_ASSET_BASE_URL}/${normalizedFilename}`;
}

function createSceneLayerContract({
  id,
  label,
  searchParam = id,
  materialMode,
  required,
  filename,
}) {
  return {
    id,
    label,
    searchParam,
    materialMode,
    required,
    filename,
    url: buildSceneAssetUrl(filename),
  };
}

export const SCENE_ASSET_BASE_URL = normalizeSceneAssetBaseUrl(
  import.meta.env.VITE_SCENE_ASSET_BASE_URL,
);

export const DEFAULT_SCENE_FILE_URL = buildSceneAssetUrl("scene.glb");
const SCENE_LAYER_CONTRACTS = [
  createSceneLayerContract({
    id: "background",
    label: "Background",
    searchParam: "background",
    materialMode: "background",
    required: false,
    filename: "bg.glb",
  }),
  createSceneLayerContract({
    id: "bg360",
    label: "BG360",
    searchParam: "bg360",
    materialMode: "unlitAlpha",
    required: false,
    filename: "BG360.glb",
  }),
  createSceneLayerContract({
    id: "base",
    label: "Base",
    searchParam: "scene",
    materialMode: "baked",
    required: true,
    filename: "scene.glb",
  }),
  createSceneLayerContract({
    id: "alpha",
    label: "Alpha",
    searchParam: "alpha",
    materialMode: "alphaCutout",
    required: false,
    filename: "leaf.glb",
  }),
  createSceneLayerContract({
    id: "glass",
    label: "Glass",
    searchParam: "glass",
    materialMode: "glass",
    required: false,
    filename: "glass.glb",
  }),
  createSceneLayerContract({
    id: "reflect",
    label: "Reflect",
    searchParam: "reflect",
    materialMode: "reflect",
    required: false,
    filename: "reflect.glb",
  }),
  createSceneLayerContract({
    id: "fx",
    label: "FX",
    searchParam: "fx",
    materialMode: "fx",
    required: false,
    filename: "fx.glb",
  }),
];
const OPTIONAL_LAYER_HINTS = SCENE_LAYER_CONTRACTS
  .filter((layer) => !layer.required)
  .map((layer) => `<code>${layer.filename}</code>`)
  .join(", ");

export const SCENE_LOAD_STATUS_HTML = `Looking for <code>${DEFAULT_SCENE_FILE_URL}</code> and optional ${OPTIONAL_LAYER_HINTS} layers...`;

export function getMissingSceneStatusMessage() {
  if (SCENE_ASSET_BASE_URL === DEFAULT_SCENE_ASSET_BASE_URL) {
    return "No GLTF found yet. Placeholder room loaded. Drop your file into /public/assets/scene/.";
  }

  return `No GLTF found yet. Placeholder room loaded. Check ${SCENE_ASSET_BASE_URL} for scene assets or override with ?scene=...`;
}

export const VIEWER_CONFIG = {
  debug: {
    logMaterialTargets: false,
  },
  colorPipeline: {
    toneMapping: "standard",
    exposure: 0.95,
  },
  postProcessing: {
    selectiveBloom: {
      enabled: true,
      layer: 1,
      strength: 0.65,
      radius: 0.38,
      threshold: 0.05,
    },
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
  sceneLayers: SCENE_LAYER_CONTRACTS,
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
      filename: "fire.mp4",
      url: buildSceneAssetUrl("fire.mp4"),
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
      filename: "cubemap.png",
      url: buildSceneAssetUrl("cubemap.png"),
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

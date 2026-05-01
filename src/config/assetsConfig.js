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

export const SCENE_LAYER_CONTRACTS = [
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

export const ASSETS_CONFIG = {
  sceneAssetBaseUrl: SCENE_ASSET_BASE_URL,
  sceneLayers: SCENE_LAYER_CONTRACTS,
  fireVideo: {
    searchParam: "fireVideo",
    filename: "fire.mp4",
    url: buildSceneAssetUrl("fire.mp4"),
  },
  reflectEnvironment: {
    searchParam: "reflectEnv",
    filename: "cubemap.png",
    url: buildSceneAssetUrl("cubemap.png"),
  },
};

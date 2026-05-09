const DEFAULT_LOCAL_SCENE_ASSET_BASE_URL = "/assets/scene";
const ENV = import.meta.env ?? {};

function normalizeConfiguredAssetBaseUrl(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.replace(/\/+$/, "");
}

function normalizeRelativeAssetPath(value) {
  if (typeof value !== "string") {
    throw new TypeError("Asset path must be a string.");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new TypeError("Asset path must not be empty.");
  }

  return trimmed.replace(/^\/+/, "");
}

function buildAssetUrl(baseUrl, relativePath) {
  return `${baseUrl}/${relativePath}`;
}

function buildLocalPublicAssetPath(relativePath) {
  const normalizedBaseUrl = LOCAL_SCENE_ASSET_BASE_URL.replace(/^\/+/, "");
  return `/public/${normalizedBaseUrl}/${relativePath}`;
}

function createAssetContract({
  id,
  label = id,
  searchParam = id,
  localPath,
  remotePath = localPath,
  runtime = {},
  ...rest
}) {
  const normalizedLocalPath = normalizeRelativeAssetPath(localPath);
  const normalizedRemotePath = normalizeRelativeAssetPath(remotePath);
  const localUrl = buildAssetUrl(LOCAL_SCENE_ASSET_BASE_URL, normalizedLocalPath);
  const remoteUrl = REMOTE_SCENE_ASSET_BASE_URL
    ? buildAssetUrl(REMOTE_SCENE_ASSET_BASE_URL, normalizedRemotePath)
    : null;

  return {
    id,
    label,
    searchParam,
    ...rest,
    localPath: normalizedLocalPath,
    remotePath: normalizedRemotePath,
    path: ACTIVE_SCENE_ASSET_SOURCE === "remote" ? normalizedRemotePath : normalizedLocalPath,
    urls: {
      local: localUrl,
      remote: remoteUrl,
    },
    url: remoteUrl ?? localUrl,
    runtime: {
      ...runtime,
    },
  };
}

export const LOCAL_SCENE_ASSET_BASE_URL = DEFAULT_LOCAL_SCENE_ASSET_BASE_URL;
export const REMOTE_SCENE_ASSET_BASE_URL = normalizeConfiguredAssetBaseUrl(
  ENV.VITE_SCENE_ASSET_BASE_URL,
);
export const ACTIVE_SCENE_ASSET_SOURCE = REMOTE_SCENE_ASSET_BASE_URL ? "remote" : "local";
export const SCENE_ASSET_BASE_URL = REMOTE_SCENE_ASSET_BASE_URL || LOCAL_SCENE_ASSET_BASE_URL;

export const SCENE_LAYER_CONTRACTS = [
  createAssetContract({
    id: "background",
    label: "Background",
    searchParam: "background",
    materialMode: "background",
    required: false,
    localPath: "bg.glb",
    runtime: {
      registerAsBackgroundRoot: true,
    },
  }),
  createAssetContract({
    id: "sky",
    label: "Sky",
    searchParam: "sky",
    materialMode: "unlitAlpha",
    required: false,
    localPath: "sky.glb",
  }),
  createAssetContract({
    id: "base",
    label: "Base",
    searchParam: "scene",
    materialMode: "baked",
    required: true,
    localPath: "scene.glb",
    runtime: {
      preferAsSpawnRoot: true,
      applyBaseTextureOptimizations: true,
    },
  }),
  createAssetContract({
    id: "collision",
    label: "Collision",
    searchParam: "collision",
    materialMode: "collision",
    required: false,
    localPath: "collision.glb",
    runtime: {
      registerAsCollisionRoot: true,
    },
  }),
  createAssetContract({
    id: "alpha",
    label: "Alpha",
    searchParam: "alpha",
    materialMode: "alphaCutout",
    required: false,
    localPath: "translucent.glb",
  }),
  createAssetContract({
    id: "glass",
    label: "Glass",
    searchParam: "glass",
    materialMode: "glass",
    required: false,
    localPath: "glass.glb",
  }),
  createAssetContract({
    id: "reflect",
    label: "Reflect",
    searchParam: "reflect",
    materialMode: "reflect",
    required: false,
    localPath: "reflect.glb",
  }),
  createAssetContract({
    id: "windows",
    label: "Windows",
    searchParam: "windows",
    materialMode: "windows",
    required: false,
    localPath: "windows.glb",
  }),
  createAssetContract({
    id: "fire",
    label: "Fire",
    searchParam: "fire",
    materialMode: "fx",
    required: false,
    localPath: "fire.glb",
    runtime: {
      applyFireVideoTexture: true,
      enableBloom: true,
    },
  }),
  createAssetContract({
    id: "emissive",
    label: "Emissive",
    searchParam: "emissive",
    materialMode: "emissive",
    required: false,
    localPath: "emissive.glb",
    runtime: {
      enableBloom: true,
    },
  }),
];

export const PROBES_ASSET_CONTRACT = createAssetContract({
  id: "probes",
  label: "Probes",
  searchParam: "probes",
  localPath: "probes.glb",
  required: false,
});

export const FIRE_VIDEO_ASSET_CONTRACT = createAssetContract({
  id: "fireVideo",
  label: "Fire Video",
  searchParam: "fireVideo",
  localPath: "fire.mp4",
});

export const AMBIENT_AUDIO_ASSET_CONTRACT = {
  id: "ambientAudio",
  label: "Ambient Audio",
  searchParam: "ambientAudio",
  localPath: "atlasaudio-ambient-soft-511880.mp3",
  url: "/assets/audio/atlasaudio-ambient-soft-511880.mp3",
};

const REQUIRED_SCENE_LAYER = SCENE_LAYER_CONTRACTS.find((layer) => layer.required);
const OPTIONAL_LAYER_HINTS = SCENE_LAYER_CONTRACTS
  .filter((layer) => !layer.required)
  .map((layer) => `<code>${layer.path}</code>`)
  .join(", ");

export const DEFAULT_SCENE_FILE_URL = REQUIRED_SCENE_LAYER?.url ?? "";
export const SCENE_LOAD_STATUS_HTML = `Looking for <code>${DEFAULT_SCENE_FILE_URL}</code> and optional ${OPTIONAL_LAYER_HINTS} layers...`;

export function getMissingSceneStatusMessage() {
  if (!REQUIRED_SCENE_LAYER) {
    return "No GLTF found yet. Placeholder room loaded.";
  }

  if (ACTIVE_SCENE_ASSET_SOURCE === "local") {
    return `No GLTF found yet. Placeholder room loaded. Drop your file into ${buildLocalPublicAssetPath(REQUIRED_SCENE_LAYER.localPath)}.`;
  }

  return `No GLTF found yet. Placeholder room loaded. Check ${SCENE_ASSET_BASE_URL} for scene assets or override with ?${REQUIRED_SCENE_LAYER.searchParam}=...`;
}

export const RENDERS_BASE_URL = normalizeConfiguredAssetBaseUrl(
  ENV.VITE_RENDER_ASSET_BASE_URL,
) || (REMOTE_SCENE_ASSET_BASE_URL
  ? REMOTE_SCENE_ASSET_BASE_URL.replace(/\/[^/]+\/?$/, "/renders")
  : "/assets/renders");

export const LOADING_BACKGROUND_URL = `${RENDERS_BASE_URL}/stills/up_still_004.jpg`;

export const ASSETS_CONFIG = {
  sceneAssetBaseUrl: SCENE_ASSET_BASE_URL,
  sceneAssetSource: ACTIVE_SCENE_ASSET_SOURCE,
  localSceneAssetBaseUrl: LOCAL_SCENE_ASSET_BASE_URL,
  remoteSceneAssetBaseUrl: REMOTE_SCENE_ASSET_BASE_URL,
  sceneLayers: SCENE_LAYER_CONTRACTS,
  fireVideo: FIRE_VIDEO_ASSET_CONTRACT,
  ambientAudio: AMBIENT_AUDIO_ASSET_CONTRACT,
  probes: PROBES_ASSET_CONTRACT,
};

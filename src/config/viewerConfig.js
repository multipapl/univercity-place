import {
  ASSETS_CONFIG,
  DEFAULT_SCENE_FILE_URL,
  getMissingSceneStatusMessage,
  LOADING_BACKGROUND_URL,
  RENDERS_BASE_URL,
  SCENE_ASSET_BASE_URL,
  SCENE_LOAD_STATUS_HTML,
} from "./assetsConfig.js";
import { CAMERA_CONFIG, LOCOMOTION_CONFIG } from "./cameraConfig.js";
import { DEBUG_CONFIG, RUNTIME_OPTIMIZATION_CONFIG } from "./diagnosticsConfig.js";
import { INTERFACE_CONFIG } from "./interfaceConfig.js";
import { MATERIAL_PRESETS, MATERIAL_TWEAKS } from "./materialsConfig.js";
import { COLOR_PIPELINE_CONFIG, POST_PROCESSING_CONFIG } from "./renderingConfig.js";

export {
  DEFAULT_SCENE_FILE_URL,
  getMissingSceneStatusMessage,
  LOADING_BACKGROUND_URL,
  RENDERS_BASE_URL,
  SCENE_ASSET_BASE_URL,
  SCENE_LOAD_STATUS_HTML,
};

export const VIEWER_CONFIG = {
  assets: ASSETS_CONFIG,
  debug: DEBUG_CONFIG,
  colorPipeline: COLOR_PIPELINE_CONFIG,
  postProcessing: POST_PROCESSING_CONFIG,
  camera: CAMERA_CONFIG,
  runtimeOptimization: RUNTIME_OPTIMIZATION_CONFIG,
  interface: INTERFACE_CONFIG,
  sceneLayers: ASSETS_CONFIG.sceneLayers,
  locomotion: LOCOMOTION_CONFIG,
  materialTweaks: MATERIAL_TWEAKS,
  materialPresets: MATERIAL_PRESETS,
};

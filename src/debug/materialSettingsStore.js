function normalizeNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function createDefaultMaterialSettingsDocument(baseViewerConfig) {
  const background = baseViewerConfig.materialPresets?.background ?? {};
  const sky = baseViewerConfig.materialPresets?.sky ?? {};
  const reflect = baseViewerConfig.materialPresets?.reflectMaterial ?? {};

  return {
    version: 1,
    background: {
      hueDegrees: normalizeNumber(background.hueDegrees, 0),
      saturation: normalizeNumber(background.saturation, 1),
      value: normalizeNumber(background.value, 1),
      gamma: normalizeNumber(background.gamma, 1),
    },
    sky: {
      hueDegrees: normalizeNumber(sky.hueDegrees, 0),
      saturation: normalizeNumber(sky.saturation, 1),
      value: normalizeNumber(sky.value, 1),
      gamma: normalizeNumber(sky.gamma, 1),
    },
    reflect: {
      envMapIntensity: normalizeNumber(reflect.envMapIntensity, 1),
      ior: normalizeNumber(reflect.ior, 1.5),
      specularIntensity: normalizeNumber(reflect.specularIntensity, 1),
      metalness: normalizeNumber(reflect.defaultMetalness, 1),
      probeRotationYDegrees: normalizeNumber(reflect.envMapRotationDegrees, 0),
    },
  };
}

export function normalizeMaterialSettingsDocument(documentValue, baseViewerConfig) {
  const defaults = createDefaultMaterialSettingsDocument(baseViewerConfig);
  if (!documentValue || typeof documentValue !== "object") {
    return defaults;
  }

  return {
    version: normalizeNumber(documentValue.version, defaults.version),
    background: {
      hueDegrees: normalizeNumber(documentValue.background?.hueDegrees, defaults.background.hueDegrees),
      saturation: normalizeNumber(documentValue.background?.saturation, defaults.background.saturation),
      value: normalizeNumber(documentValue.background?.value, defaults.background.value),
      gamma: normalizeNumber(documentValue.background?.gamma, defaults.background.gamma),
    },
    sky: {
      hueDegrees: normalizeNumber(documentValue.sky?.hueDegrees, defaults.sky.hueDegrees),
      saturation: normalizeNumber(documentValue.sky?.saturation, defaults.sky.saturation),
      value: normalizeNumber(documentValue.sky?.value, defaults.sky.value),
      gamma: normalizeNumber(documentValue.sky?.gamma, defaults.sky.gamma),
    },
    reflect: {
      envMapIntensity: normalizeNumber(documentValue.reflect?.envMapIntensity, defaults.reflect.envMapIntensity),
      ior: normalizeNumber(documentValue.reflect?.ior, defaults.reflect.ior),
      specularIntensity: normalizeNumber(documentValue.reflect?.specularIntensity, defaults.reflect.specularIntensity),
      metalness: normalizeNumber(documentValue.reflect?.metalness, defaults.reflect.metalness),
      probeRotationYDegrees: normalizeNumber(
        documentValue.reflect?.probeRotationYDegrees,
        defaults.reflect.probeRotationYDegrees,
      ),
    },
  };
}

export function applyMaterialSettingsDocumentToState(documentValue, state) {
  const {
    backgroundState,
    skyState,
    reflectionState,
  } = state;

  backgroundState.hueDegrees = documentValue.background.hueDegrees;
  backgroundState.saturation = documentValue.background.saturation;
  backgroundState.value = documentValue.background.value;
  backgroundState.gamma = documentValue.background.gamma;

  skyState.hueDegrees = documentValue.sky.hueDegrees;
  skyState.saturation = documentValue.sky.saturation;
  skyState.value = documentValue.sky.value;
  skyState.gamma = documentValue.sky.gamma;

  reflectionState.envMapIntensity = documentValue.reflect.envMapIntensity;
  reflectionState.ior = documentValue.reflect.ior;
  reflectionState.specularIntensity = documentValue.reflect.specularIntensity;
  reflectionState.metalness = documentValue.reflect.metalness;
  reflectionState.envMapRotationY = documentValue.reflect.probeRotationYDegrees * Math.PI / 180;
}

export function createMaterialSettingsDocumentFromState(state) {
  return {
    version: 1,
    background: {
      hueDegrees: state.backgroundState.hueDegrees,
      saturation: state.backgroundState.saturation,
      value: state.backgroundState.value,
      gamma: state.backgroundState.gamma,
    },
    sky: {
      hueDegrees: state.skyState.hueDegrees,
      saturation: state.skyState.saturation,
      value: state.skyState.value,
      gamma: state.skyState.gamma,
    },
    reflect: {
      envMapIntensity: state.reflectionState.envMapIntensity,
      ior: state.reflectionState.ior,
      specularIntensity: state.reflectionState.specularIntensity,
      metalness: state.reflectionState.metalness,
      probeRotationYDegrees: state.reflectionState.envMapRotationY * 180 / Math.PI,
    },
  };
}

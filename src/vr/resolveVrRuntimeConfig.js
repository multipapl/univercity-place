const XR_QUALITY_PRESETS = {
  stable: {
    antialias: false,
    pixelRatioCap: 1,
    framebufferScaleFactor: 0.5,
    foveation: 1,
    lowMemoryBaseMipmaps: true,
    baseTextureMaxSize: 1024,
  },
  avp: {
    antialias: true,
    pixelRatioCap: 1,
    framebufferScaleFactor: 1,
    foveation: 1,
    lowMemoryBaseMipmaps: false,
    baseTextureMaxSize: 2048,
  },
  sharp: {
    antialias: true,
    pixelRatioCap: 1,
    framebufferScaleFactor: 1,
    foveation: 0,
    lowMemoryBaseMipmaps: false,
    baseTextureMaxSize: 0,
  },
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function resolveVrRuntimeConfig({
  viewerConfig,
  searchParams,
}) {
  const config = viewerConfig?.vr ?? {};
  const allowUrlOverride = config.allowUrlOverride !== false;
  const enabledQueryValue = allowUrlOverride
    ? parseBooleanFlag(searchParams.get(config.queryParam ?? "vr"))
    : null;
  const disabledQueryValue = allowUrlOverride
    ? parseBooleanFlag(searchParams.get(config.disableQueryParam ?? "novr"))
    : null;
  const enabled = disabledQueryValue === true
    ? false
    : (enabledQueryValue ?? Boolean(config.enabled));

  if (!enabled) {
    return {
      enabled: false,
      renderer: {
        antialias: true,
        pixelRatioCap: 2,
      },
      runtimeOptimization: {},
      sceneLoader: {},
      materialSafetyProfile: {},
      postProcessing: {
        disableSelectiveBloom: false,
      },
      session: {
        optionalFeatures: [],
        framebufferScaleFactor: null,
        foveation: null,
      },
    };
  }

  const safeQueryValue = allowUrlOverride
    ? parseBooleanFlag(searchParams.get("safe"))
    : null;
  const baseOnlyQueryValue = allowUrlOverride
    ? parseBooleanFlag(searchParams.get("baseOnly"))
    : null;
  const qualityQueryValue = allowUrlOverride
    ? `${searchParams.get("xrQuality") ?? ""}`.trim().toLowerCase()
    : "";
  const framebufferScaleQueryValue = allowUrlOverride
    ? Number.parseFloat(searchParams.get("xrScale") ?? "")
    : Number.NaN;
  const foveationQueryValue = allowUrlOverride
    ? Number.parseFloat(searchParams.get("xrFoveation") ?? "")
    : Number.NaN;

  const safeMode = safeQueryValue ?? (config.startupMode !== "full");
  const baseOnly = baseOnlyQueryValue ?? Boolean(config.baseOnly);
  const qualityPresetName = qualityQueryValue || `${config.qualityPreset ?? "stable"}`.trim().toLowerCase();
  const qualityPreset = XR_QUALITY_PRESETS[qualityPresetName] ?? XR_QUALITY_PRESETS.stable;
  const framebufferScaleFactor = Number.isFinite(framebufferScaleQueryValue)
    ? clamp(framebufferScaleQueryValue, 0.25, 1)
    : (Number.isFinite(config.framebufferScaleFactor)
        ? clamp(config.framebufferScaleFactor, 0.25, 1)
        : qualityPreset.framebufferScaleFactor);
  const foveation = Number.isFinite(foveationQueryValue)
    ? clamp(foveationQueryValue, 0, 1)
    : (Number.isFinite(config.foveation)
        ? clamp(config.foveation, 0, 1)
        : qualityPreset.foveation);

  const safeLayerProfile = config.safeLayerProfile ?? {};

  return {
    enabled: true,
    safeMode,
    baseOnly,
    renderer: {
      antialias: safeMode ? qualityPreset.antialias : true,
      pixelRatioCap: safeMode ? qualityPreset.pixelRatioCap : 2,
    },
    runtimeOptimization: safeMode
      ? {
          lowMemoryBaseMipmaps: qualityPreset.lowMemoryBaseMipmaps,
          baseTextureMaxSize: qualityPreset.baseTextureMaxSize,
          freeOriginalTextures: true,
        }
      : {},
    sceneLoader: safeMode
      ? {
          requiredLayersOnly: baseOnly,
          includeLayerIds: safeLayerProfile.includeLayerIds ?? [],
          excludeLayerIds: baseOnly ? [] : (safeLayerProfile.excludeLayerIds ?? []),
          disableFireVideoTextures: safeLayerProfile.disableFireVideoTextures === true,
          disableProbeLoad: baseOnly && safeLayerProfile.disableProbeLoadWhenBaseOnly !== false,
        }
      : {},
    materialSafetyProfile: safeMode
      ? {
          ...config.materialSafetyProfile,
        }
      : {},
    postProcessing: {
      disableSelectiveBloom: safeMode,
    },
    session: {
      optionalFeatures: [...(config.session?.optionalFeatures ?? [])],
      framebufferScaleFactor,
      foveation,
    },
  };
}

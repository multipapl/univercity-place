export const VR_CONFIG = {
  enabled: true,
  allowUrlOverride: true,
  queryParam: "vr",
  disableQueryParam: "novr",
  startupMode: "safe",
  baseOnly: false,
  qualityPreset: "stable",
  framebufferScaleFactor: 0.5,
  foveation: 1,
  safeLayerProfile: {
    includeLayerIds: [],
    excludeLayerIds: [],
    disableFireVideoTextures: true,
    disableProbeLoadWhenBaseOnly: true,
  },
  materialSafetyProfile: {
    hideTransparentBakedMeshes: false,
    useCheapGlassMaterial: true,
  },
  session: {
    optionalFeatures: ["hand-tracking"],
  },
};

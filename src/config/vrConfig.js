export const VR_CONFIG = {
  enabled: true,
  allowUrlOverride: true,
  queryParam: "vr",
  disableQueryParam: "novr",
  startupMode: "safe",
  baseOnly: false,
  qualityPreset: "avp",
  framebufferScaleFactor: 1,
  foveation: 1,
  safeLayerProfile: {
    includeLayerIds: [],
    excludeLayerIds: [],
    disableFireVideoTextures: false,
    disableProbeLoadWhenBaseOnly: true,
  },
  materialSafetyProfile: {
    hideTransparentBakedMeshes: true,
    useCheapGlassMaterial: true,
  },
  session: {
    optionalFeatures: ["hand-tracking"],
  },
};

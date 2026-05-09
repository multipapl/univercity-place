export const COLOR_PIPELINE_CONFIG = {
  toneMapping: "none",
  exposure: 1.0,
};

export const POST_PROCESSING_CONFIG = {
  selectiveBloom: {
    enabled: true,
    autoDisableOnLowEndDevices: true,
    layer: 1,
    lowEndDeviceMemoryGb: 8,
    lowEndHardwareConcurrency: 4,
    strength: 0.65,
    radius: 0.38,
    threshold: 0.05,
  },
};

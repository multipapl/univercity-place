export const COLOR_PIPELINE_CONFIG = {
  toneMapping: "standard",
  exposure: 0.95,
};

export const POST_PROCESSING_CONFIG = {
  selectiveBloom: {
    enabled: true,
    autoDisableOnLowEndDevices: true,
    layer: 1,
    lowEndDeviceMemoryGb: 4,
    lowEndHardwareConcurrency: 4,
    strength: 0.65,
    radius: 0.38,
    threshold: 0.05,
  },
};

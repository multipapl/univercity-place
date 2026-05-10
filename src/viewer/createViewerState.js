export function createViewerState({
  baseViewerConfig,
  initialRuntimeOptimizationState,
}) {
  const backgroundPreset = {
    hueDegrees: 0,
    saturation: 1,
    value: 1,
    gamma: 1,
    rotationDegreesPerMinute: 0,
    ...(baseViewerConfig.materialPresets?.background ?? {}),
  };
  const skyPreset = {
    hueDegrees: 0,
    saturation: 1,
    value: 1,
    gamma: 1,
    ...(baseViewerConfig.materialPresets?.sky ?? {}),
  };
  const runtimeOptimizationState = {
    lowMemoryBaseMipmaps: initialRuntimeOptimizationState.lowMemoryBaseMipmaps,
    baseTextureMaxSize: initialRuntimeOptimizationState.baseTextureMaxSize,
    renderScale: initialRuntimeOptimizationState.renderScale ?? 1.0,
    freeOriginalTextures: initialRuntimeOptimizationState.freeOriginalTextures ?? false,
  };
  const colorPipelineState = {
    toneMapping: "none",
    exposure: baseViewerConfig.colorPipeline.exposure,
  };
  const interfaceState = {
    showCrosshair: baseViewerConfig.interface.showCrosshair,
  };
  const cameraMotionState = {
    enabled: baseViewerConfig.camera.ambientMotion.enabled,
  };
  const ambientAudioState = {
    volume: baseViewerConfig.audio?.ambient?.defaultVolume ?? 0.06,
  };
  const viewerConfig = {
    ...baseViewerConfig,
    camera: {
      ...baseViewerConfig.camera,
      ambientMotion: {
        ...baseViewerConfig.camera.ambientMotion,
      },
    },
    colorPipeline: colorPipelineState,
    interface: interfaceState,
    audio: {
      ...baseViewerConfig.audio,
      ambient: {
        ...baseViewerConfig.audio?.ambient,
      },
    },
    locomotion: {
      ...baseViewerConfig.locomotion,
    },
    postProcessing: {
      ...baseViewerConfig.postProcessing,
    },
    runtimeOptimization: runtimeOptimizationState,
  };
  const diagnosticsState = {
    loadedLayers: [],
    frameAccumulator: 0,
    frameCounter: 0,
    fps: 0,
    frameMs: 0,
    lastUpdateAt: 0,
  };
  const backgroundState = {
    hueDegrees: backgroundPreset.hueDegrees,
    saturation: backgroundPreset.saturation,
    value: backgroundPreset.value,
    gamma: backgroundPreset.gamma,
    materials: new Set(),
    roots: new Set(),
    motionTime: 0,
    rotationRadiansPerSecond:
      (backgroundPreset.rotationDegreesPerMinute * Math.PI / 180) / 60,
  };
  const skyState = {
    hueDegrees: skyPreset.hueDegrees,
    saturation: skyPreset.saturation,
    value: skyPreset.value,
    gamma: skyPreset.gamma,
    materials: new Set(),
  };
  const fireState = {
    hueDegrees: baseViewerConfig.materialPresets.fireVideo.hueDegrees,
    saturation: baseViewerConfig.materialPresets.fireVideo.saturation,
    value: baseViewerConfig.materialPresets.fireVideo.value,
    materials: new Set(),
  };
  const reflectionState = {
    envMapIntensity: baseViewerConfig.materialPresets.reflectMaterial.envMapIntensity,
    ior: baseViewerConfig.materialPresets.reflectMaterial.ior,
    specularIntensity: baseViewerConfig.materialPresets.reflectMaterial.specularIntensity,
    envMapRotationY: baseViewerConfig.materialPresets.reflectMaterial.envMapRotationDegrees * Math.PI / 180,
    materials: new Set(),
    probeMaterials: new Set(),
  };
  const viewerLifecycle = {
    animationFrameId: null,
    timeoutId: null,
    disposed: false,
    renderMode: "active",
    renderRequested: false,
    started: false,
  };
  const helpOverlayState = {
    isOpen: false,
    relockAfterClose: false,
  };
  const controlDockState = {
    hideTimeout: null,
  };

  return {
    runtimeOptimizationState,
    colorPipelineState,
    interfaceState,
    cameraMotionState,
    ambientAudioState,
    viewerConfig,
    diagnosticsState,
    backgroundState,
    skyState,
    fireState,
    reflectionState,
    viewerLifecycle,
    helpOverlayState,
    controlDockState,
  };
}

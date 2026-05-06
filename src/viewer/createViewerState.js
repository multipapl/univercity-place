export function createViewerState({
  baseViewerConfig,
  initialRuntimeOptimizationState,
}) {
  const runtimeOptimizationState = {
    lowMemoryBaseMipmaps: initialRuntimeOptimizationState.lowMemoryBaseMipmaps,
    baseTextureMaxSize: initialRuntimeOptimizationState.baseTextureMaxSize,
  };
  const colorPipelineState = {
    toneMapping: baseViewerConfig.colorPipeline.toneMapping,
    exposure: baseViewerConfig.colorPipeline.exposure,
  };
  const interfaceState = {
    showCrosshair: baseViewerConfig.interface.showCrosshair,
  };
  const cameraMotionState = {
    enabled: baseViewerConfig.camera.ambientMotion.enabled,
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
    hueDegrees: baseViewerConfig.materialPresets.background.hueDegrees,
    saturation: baseViewerConfig.materialPresets.background.saturation,
    value: baseViewerConfig.materialPresets.background.value,
    materials: new Set(),
    roots: new Set(),
    motionTime: 0,
    rotationRadiansPerSecond:
      (baseViewerConfig.materialPresets.background.rotationDegreesPerMinute * Math.PI / 180) / 60,
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
    metalness: baseViewerConfig.materialPresets.reflectMaterial.defaultMetalness,
    envMapRotationY: baseViewerConfig.materialPresets.reflectMaterial.envMapRotationDegrees * Math.PI / 180,
    materials: new Set(),
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
    viewerConfig,
    diagnosticsState,
    backgroundState,
    fireState,
    reflectionState,
    viewerLifecycle,
    helpOverlayState,
    controlDockState,
  };
}

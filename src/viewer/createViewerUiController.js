import { Euler, NoToneMapping } from "three";

export function createViewerUiController({
  refs,
  nodes,
  state,
  viewerConfig,
  materialPipeline,
  renderer,
  selectiveBloomConfig,
  selectiveBloomPipeline,
  getEffectivePixelRatio = () => Math.min(window.devicePixelRatio, 2),
  navigationController,
  menuController,
  getDebugMode,
  isTouchDevice,
}) {
  function syncSliderValue(slider, nextValue) {
    if (slider) {
      slider.value = nextValue;
    }
  }

  function syncTextValue(node, nextValue) {
    if (!node) {
      return;
    }

    node.value = nextValue;
    node.textContent = nextValue;
  }

  function syncQuickReadouts() {
    const { fov, height } = navigationController.cameraState;
    const normalizedFov = `${fov.toFixed(0)}°`;
    const normalizedHeight = height.toFixed(2);

    if (refs.quickCameraFovValue) {
      refs.quickCameraFovValue.textContent = normalizedFov;
    }

    if (refs.bottomQuickCameraFovValue) {
      refs.bottomQuickCameraFovValue.textContent = normalizedFov;
    }

    if (refs.quickCameraHeightValue) {
      refs.quickCameraHeightValue.textContent = normalizedHeight;
    }

    if (refs.bottomQuickCameraHeightValue) {
      refs.bottomQuickCameraHeightValue.textContent = normalizedHeight;
    }
  }

  function syncCameraFovReadouts(nextFov = navigationController.cameraState.fov) {
    const normalizedFov = `${nextFov.toFixed(0)}°`;
    syncSliderValue(refs.cameraFovSlider, nextFov.toFixed(0));
    syncTextValue(refs.cameraFovValue, normalizedFov);
    syncQuickReadouts();
  }

  function syncCameraHeightReadouts(nextHeight = navigationController.cameraState.height) {
    const normalizedHeight = nextHeight.toFixed(2);
    syncSliderValue(refs.cameraHeightSlider, normalizedHeight);
    syncTextValue(refs.cameraHeightValue, normalizedHeight);
    syncQuickReadouts();
  }

  function applyViewportColorSettings() {
    state.colorPipelineState.toneMapping = "none";
    renderer.toneMapping = NoToneMapping;
    renderer.toneMappingExposure = state.colorPipelineState.exposure;

    syncSliderValue(refs.exposureSlider, state.colorPipelineState.exposure.toFixed(2));
    syncTextValue(refs.exposureValue, state.colorPipelineState.exposure.toFixed(2));
  }

  function applySelectiveBloomSettings() {
    selectiveBloomPipeline.applySettings(selectiveBloomConfig);
    syncSliderValue(refs.selectiveBloomStrengthSlider, selectiveBloomConfig.strength.toFixed(2));
    syncTextValue(refs.selectiveBloomStrengthValue, selectiveBloomConfig.strength.toFixed(2));
  }

  function syncRenderScaleReadouts(nextScale = state.runtimeOptimizationState?.renderScale ?? 1) {
    const normalizedScale = nextScale.toFixed(2);
    syncSliderValue(refs.renderScaleSlider, normalizedScale);
    syncTextValue(refs.renderScaleValue, normalizedScale);
  }

  function syncPostProcessingSize() {
    const pixelRatio = getEffectivePixelRatio();
    const width = nodes.viewport.clientWidth || window.innerWidth;
    const height = nodes.viewport.clientHeight || window.innerHeight;
    selectiveBloomPipeline.syncSize(width, height, pixelRatio);
  }

  function applyCameraSettings() {
    navigationController.applyCameraSettings();
    syncCameraFovReadouts();
    syncCameraHeightReadouts();
  }

  function applyCameraMotionSettings() {
    if (refs.cameraShakeToggle) {
      refs.cameraShakeToggle.checked = state.cameraMotionState.enabled;
    }
  }

  function clearCameraAmbientMotion() {
    navigationController.clearCameraAmbientMotion();
  }

  function applyCameraAmbientMotion(delta) {
    navigationController.applyCameraAmbientMotion(delta);
  }

  function applyInterfaceSettings() {
    if (refs.showCrosshairToggle) {
      refs.showCrosshairToggle.checked = state.interfaceState.showCrosshair;
    }

    if (!nodes.crosshair) {
      return;
    }

    if (isTouchDevice) {
      nodes.crosshair.style.display = "none";
      return;
    }

    nodes.crosshair.style.display = state.interfaceState.showCrosshair ? "" : "none";
  }

  function applyDebugModeSettings() {
    const debugMode = getDebugMode();
    const menuMode = debugMode ? "debug" : "viewer";
    nodes.hud.classList.toggle("is-debug-mode", debugMode);
    menuController.setMode(menuMode);

    if (refs.bottomDockDebugIndicator) {
      refs.bottomDockDebugIndicator.hidden = !debugMode;
    }
  }

  function applyColorCorrection(materials, correction) {
    materials.forEach((material) => {
      materialPipeline.applyDebugColorCorrection(material, correction);
    });
  }

  function applyBackgroundColorSettings() {
    syncSliderValue(refs.backgroundHueSlider, state.backgroundState.hueDegrees.toFixed(0));
    syncTextValue(refs.backgroundHueValue, `${state.backgroundState.hueDegrees.toFixed(0)}°`);
    syncSliderValue(refs.backgroundSaturationSlider, state.backgroundState.saturation.toFixed(2));
    syncTextValue(refs.backgroundSaturationValue, state.backgroundState.saturation.toFixed(2));
    syncSliderValue(refs.backgroundValueSlider, state.backgroundState.value.toFixed(2));
    syncTextValue(refs.backgroundValueOutput, state.backgroundState.value.toFixed(2));
    syncSliderValue(refs.backgroundGammaSlider, state.backgroundState.gamma.toFixed(2));
    syncTextValue(refs.backgroundGammaValue, state.backgroundState.gamma.toFixed(2));

    applyColorCorrection(state.backgroundState.materials, {
      hue: state.backgroundState.hueDegrees,
      saturation: state.backgroundState.saturation,
      value: state.backgroundState.value,
      gamma: state.backgroundState.gamma,
    });
  }

  function applySkyColorSettings() {
    syncSliderValue(refs.skyHueSlider, state.skyState.hueDegrees.toFixed(0));
    syncTextValue(refs.skyHueValue, `${state.skyState.hueDegrees.toFixed(0)}°`);
    syncSliderValue(refs.skySaturationSlider, state.skyState.saturation.toFixed(2));
    syncTextValue(refs.skySaturationValue, state.skyState.saturation.toFixed(2));
    syncSliderValue(refs.skyValueSlider, state.skyState.value.toFixed(2));
    syncTextValue(refs.skyValueOutput, state.skyState.value.toFixed(2));
    syncSliderValue(refs.skyGammaSlider, state.skyState.gamma.toFixed(2));
    syncTextValue(refs.skyGammaValue, state.skyState.gamma.toFixed(2));

    applyColorCorrection(state.skyState.materials, {
      hue: state.skyState.hueDegrees,
      saturation: state.skyState.saturation,
      value: state.skyState.value,
      gamma: state.skyState.gamma,
    });
  }

  function updateBackgroundMotion(delta) {
    state.backgroundState.motionTime += delta;

    state.backgroundState.materials.forEach((material) => {
      const uniforms = material.uniforms ?? material.userData.viewerBackgroundUniforms;
      if (!uniforms?.viewerBackgroundTime) {
        return;
      }

      uniforms.viewerBackgroundTime.value = state.backgroundState.motionTime;
    });

    if (!state.backgroundState.rotationRadiansPerSecond || !state.backgroundState.roots.size) {
      return;
    }

    state.backgroundState.roots.forEach((root) => {
      root.rotation.y += state.backgroundState.rotationRadiansPerSecond * delta;
    });
  }

  function applyFireColorSettings() {
    syncSliderValue(refs.fireHueSlider, state.fireState.hueDegrees.toFixed(0));
    syncTextValue(refs.fireHueValue, `${state.fireState.hueDegrees.toFixed(0)}°`);
    syncSliderValue(refs.fireSaturationSlider, state.fireState.saturation.toFixed(2));
    syncTextValue(refs.fireSaturationValue, state.fireState.saturation.toFixed(2));
    syncSliderValue(refs.fireValueSlider, state.fireState.value.toFixed(2));
    syncTextValue(refs.fireValueOutput, state.fireState.value.toFixed(2));

    state.fireState.materials.forEach((material) => {
      const uniforms = material.userData.viewerFireUniforms;
      if (!uniforms) {
        return;
      }

      uniforms.viewerFireHue.value = state.fireState.hueDegrees / 360;
      uniforms.viewerFireSaturation.value = state.fireState.saturation;
      uniforms.viewerFireValue.value = state.fireState.value;
    });
  }

  function applyReflectMaterialSettings() {
    syncSliderValue(refs.reflectEnvIntensitySlider, state.reflectionState.envMapIntensity.toFixed(2));
    syncTextValue(refs.reflectEnvIntensityValue, state.reflectionState.envMapIntensity.toFixed(2));
    syncSliderValue(refs.reflectIorSlider, state.reflectionState.ior.toFixed(2));
    syncTextValue(refs.reflectIorValue, state.reflectionState.ior.toFixed(2));
    syncSliderValue(refs.reflectSpecularSlider, state.reflectionState.specularIntensity.toFixed(2));
    syncTextValue(refs.reflectSpecularValue, state.reflectionState.specularIntensity.toFixed(2));
    const rotDeg = (state.reflectionState.envMapRotationY * 180 / Math.PI).toFixed(0);
    syncSliderValue(refs.reflectEnvRotationYSlider, rotDeg);
    syncTextValue(refs.reflectEnvRotationYValue, `${rotDeg}°`);

    state.reflectionState.materials.forEach((material) => {
      material.envMapIntensity = state.reflectionState.envMapIntensity;

      if (material.isMeshPhysicalMaterial) {
        material.ior = state.reflectionState.ior;
        material.specularIntensity = state.reflectionState.specularIntensity;
      }

      material.needsUpdate = true;
    });

    state.reflectionState.probeMaterials.forEach((material) => {
      if (!material?.isMaterial) {
        return;
      }

      material.envMapRotation ??= new Euler();
      material.envMapRotation.y = state.reflectionState.envMapRotationY;
      material.needsUpdate = true;
    });
  }

  function resetBackgroundColorSettings() {
    const defaults = viewerConfig.materialPresets.background;
    state.backgroundState.hueDegrees = defaults.hueDegrees;
    state.backgroundState.saturation = defaults.saturation;
    state.backgroundState.value = defaults.value;
    state.backgroundState.gamma = defaults.gamma;
    applyBackgroundColorSettings();
  }

  function resetSkyColorSettings() {
    const defaults = viewerConfig.materialPresets.sky;
    state.skyState.hueDegrees = defaults.hueDegrees;
    state.skyState.saturation = defaults.saturation;
    state.skyState.value = defaults.value;
    state.skyState.gamma = defaults.gamma;
    applySkyColorSettings();
  }

  function resetReflectMaterialSettings() {
    const defaults = viewerConfig.materialPresets.reflectMaterial;
    state.reflectionState.envMapIntensity = defaults.envMapIntensity;
    state.reflectionState.ior = defaults.ior;
    state.reflectionState.specularIntensity = defaults.specularIntensity;
    state.reflectionState.envMapRotationY = defaults.envMapRotationDegrees * Math.PI / 180;
    applyReflectMaterialSettings();
  }

  return {
    applyViewportColorSettings,
    applySelectiveBloomSettings,
    syncPostProcessingSize,
    applyCameraSettings,
    applyCameraMotionSettings,
    clearCameraAmbientMotion,
    applyCameraAmbientMotion,
    applyInterfaceSettings,
    applyDebugModeSettings,
    applyBackgroundColorSettings,
    applySkyColorSettings,
    updateBackgroundMotion,
    applyFireColorSettings,
    applyReflectMaterialSettings,
    resetBackgroundColorSettings,
    resetSkyColorSettings,
    resetReflectMaterialSettings,
    syncQuickReadouts,
    syncCameraFovReadouts,
    syncCameraHeightReadouts,
    syncRenderScaleReadouts,
  };
}

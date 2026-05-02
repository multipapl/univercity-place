export function createViewerUiController({
  refs,
  nodes,
  state,
  renderer,
  toneMappingModes,
  selectiveBloomConfig,
  selectiveBloomPipeline,
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
    const toneMappingKey = state.colorPipelineState.toneMapping in toneMappingModes
      ? state.colorPipelineState.toneMapping
      : "standard";
    renderer.toneMapping = toneMappingModes[toneMappingKey];
    renderer.toneMappingExposure = state.colorPipelineState.exposure;

    if (refs.toneMappingSelect) {
      refs.toneMappingSelect.value = toneMappingKey;
    }

    syncSliderValue(refs.exposureSlider, state.colorPipelineState.exposure.toFixed(2));
    syncTextValue(refs.exposureValue, state.colorPipelineState.exposure.toFixed(2));
  }

  function applySelectiveBloomSettings() {
    selectiveBloomPipeline.applySettings(selectiveBloomConfig);
    syncSliderValue(refs.selectiveBloomStrengthSlider, selectiveBloomConfig.strength.toFixed(2));
    syncTextValue(refs.selectiveBloomStrengthValue, selectiveBloomConfig.strength.toFixed(2));
  }

  function syncPostProcessingSize() {
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
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

  function applyBackgroundColorSettings() {
    syncSliderValue(refs.backgroundHueSlider, state.backgroundState.hueDegrees.toFixed(0));
    syncTextValue(refs.backgroundHueValue, `${state.backgroundState.hueDegrees.toFixed(0)}°`);
    syncSliderValue(refs.backgroundSaturationSlider, state.backgroundState.saturation.toFixed(2));
    syncTextValue(refs.backgroundSaturationValue, state.backgroundState.saturation.toFixed(2));
    syncSliderValue(refs.backgroundValueSlider, state.backgroundState.value.toFixed(2));
    syncTextValue(refs.backgroundValueOutput, state.backgroundState.value.toFixed(2));

    state.backgroundState.materials.forEach((material) => {
      const uniforms = material.uniforms ?? material.userData.viewerBackgroundUniforms;
      if (!uniforms) {
        return;
      }

      uniforms.viewerBackgroundHue.value = state.backgroundState.hueDegrees / 360;
      uniforms.viewerBackgroundSaturation.value = state.backgroundState.saturation;
      uniforms.viewerBackgroundValue.value = state.backgroundState.value;
      material.uniformsNeedUpdate = true;
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
    syncSliderValue(refs.reflectMetalnessSlider, state.reflectionState.metalness.toFixed(2));
    syncTextValue(refs.reflectMetalnessValue, state.reflectionState.metalness.toFixed(2));

    state.reflectionState.materials.forEach((material) => {
      material.envMapIntensity = state.reflectionState.envMapIntensity;
      material.metalness = state.reflectionState.metalness;

      if (material.isMeshPhysicalMaterial) {
        material.ior = state.reflectionState.ior;
        material.specularIntensity = state.reflectionState.specularIntensity;
      }

      material.needsUpdate = true;
    });
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
    updateBackgroundMotion,
    applyFireColorSettings,
    applyReflectMaterialSettings,
    syncQuickReadouts,
    syncCameraFovReadouts,
    syncCameraHeightReadouts,
  };
}

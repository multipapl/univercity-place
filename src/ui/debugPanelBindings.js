export function bindViewerUiEvents({
  refs,
  onToneMappingChange,
  onExposureChange,
  onSelectiveBloomStrengthChange,
  onCameraFovChange,
  onCameraHeightChange,
  onShowCrosshairChange,
  onCameraShakeChange,
  onBackgroundHueChange,
  onBackgroundSaturationChange,
  onBackgroundValueChange,
  onFireHueChange,
  onFireSaturationChange,
  onFireValueChange,
  onReflectEnvIntensityChange,
  onReflectIorChange,
  onReflectSpecularChange,
  onReflectMetalnessChange,
  onBaseLowMemoryToggle,
  onBaseTextureCapChange,
  onMenuToggle,
  onHelpToggle,
  onHelpClose,
  onReloadAssets,
  onExitDebug,
}) {
  const cleanupCallbacks = [];
  const bind = (target, type, handler, options) => {
    target?.addEventListener(type, handler, options);
    cleanupCallbacks.push(() => {
      target?.removeEventListener(type, handler, options);
    });
  };
  const handleToneMappingChange = (event) => {
    onToneMappingChange(event.target.value);
  };

  const handleExposureInput = (event) => {
    onExposureChange(Number(event.target.value));
  };

  const handleSelectiveBloomStrengthInput = (event) => {
    onSelectiveBloomStrengthChange(Number(event.target.value));
  };

  const handleCameraFovInput = (event) => {
    onCameraFovChange(Number(event.target.value));
  };

  const handleCameraHeightInput = (event) => {
    onCameraHeightChange(Number(event.target.value));
  };

  const handleShowCrosshairChange = (event) => {
    onShowCrosshairChange(Boolean(event.target.checked));
  };

  const handleCameraShakeChange = (event) => {
    onCameraShakeChange(Boolean(event.target.checked));
  };

  const handleBackgroundHueInput = (event) => {
    onBackgroundHueChange(Number(event.target.value));
  };

  const handleBackgroundSaturationInput = (event) => {
    onBackgroundSaturationChange(Number(event.target.value));
  };

  const handleBackgroundValueInput = (event) => {
    onBackgroundValueChange(Number(event.target.value));
  };

  const handleFireHueInput = (event) => {
    onFireHueChange(Number(event.target.value));
  };

  const handleFireSaturationInput = (event) => {
    onFireSaturationChange(Number(event.target.value));
  };

  const handleFireValueInput = (event) => {
    onFireValueChange(Number(event.target.value));
  };

  const handleReflectEnvIntensityInput = (event) => {
    onReflectEnvIntensityChange(Number(event.target.value));
  };

  const handleReflectIorInput = (event) => {
    onReflectIorChange(Number(event.target.value));
  };

  const handleReflectSpecularInput = (event) => {
    onReflectSpecularChange(Number(event.target.value));
  };

  const handleReflectMetalnessInput = (event) => {
    onReflectMetalnessChange(Number(event.target.value));
  };

  const handleBaseLowMemoryChange = (event) => {
    onBaseLowMemoryToggle(Boolean(event.target.checked));
  };

  const handleBaseTextureCapChange = (event) => {
    onBaseTextureCapChange(event.target.value);
  };

  const handleMenuToggleClick = (event) => {
    event.currentTarget?.blur?.();
    onMenuToggle();
  };

  const handleHelpToggleClick = (event) => {
    event.currentTarget?.blur?.();
    onHelpToggle();
  };

  const handleHelpCloseClick = (event) => {
    event.currentTarget?.blur?.();
    onHelpClose();
  };

  const handleReloadAssetsClick = (event) => {
    event.currentTarget?.blur?.();
    onReloadAssets();
  };

  const handleExitDebugClick = (event) => {
    event.currentTarget?.blur?.();
    onExitDebug();
  };

  bind(refs.toneMappingSelect, "change", handleToneMappingChange);
  bind(refs.exposureSlider, "input", handleExposureInput);
  bind(refs.selectiveBloomStrengthSlider, "input", handleSelectiveBloomStrengthInput);
  bind(refs.cameraFovSlider, "input", handleCameraFovInput);
  bind(refs.cameraHeightSlider, "input", handleCameraHeightInput);
  bind(refs.showCrosshairToggle, "change", handleShowCrosshairChange);
  bind(refs.cameraShakeToggle, "change", handleCameraShakeChange);
  bind(refs.backgroundHueSlider, "input", handleBackgroundHueInput);
  bind(refs.backgroundSaturationSlider, "input", handleBackgroundSaturationInput);
  bind(refs.backgroundValueSlider, "input", handleBackgroundValueInput);
  bind(refs.fireHueSlider, "input", handleFireHueInput);
  bind(refs.fireSaturationSlider, "input", handleFireSaturationInput);
  bind(refs.fireValueSlider, "input", handleFireValueInput);
  bind(refs.reflectEnvIntensitySlider, "input", handleReflectEnvIntensityInput);
  bind(refs.reflectIorSlider, "input", handleReflectIorInput);
  bind(refs.reflectSpecularSlider, "input", handleReflectSpecularInput);
  bind(refs.reflectMetalnessSlider, "input", handleReflectMetalnessInput);
  bind(refs.baseLowMemoryToggle, "change", handleBaseLowMemoryChange);
  bind(refs.baseTextureCapSelect, "change", handleBaseTextureCapChange);
  bind(refs.menuToggleButton, "click", handleMenuToggleClick);
  bind(refs.helpToggleButton, "click", handleHelpToggleClick);
  bind(refs.bottomHelpToggleButton, "click", handleHelpToggleClick);
  bind(refs.helpCloseButton, "click", handleHelpCloseClick);
  bind(refs.helpFab, "click", handleHelpToggleClick);
  bind(refs.reloadAssetsButton, "click", handleReloadAssetsClick);
  bind(refs.exitDebugButton, "click", handleExitDebugClick);

  return () => {
    cleanupCallbacks.forEach((cleanup) => {
      cleanup();
    });
    cleanupCallbacks.length = 0;
  };
}

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
  onToggleDebugMode,
  onMenuClose,
  onReloadAssets,
  onExitDebug,
}) {
  refs.toneMappingSelect?.addEventListener("change", (event) => {
    onToneMappingChange(event.target.value);
  });

  refs.exposureSlider?.addEventListener("input", (event) => {
    onExposureChange(Number(event.target.value));
  });

  refs.selectiveBloomStrengthSlider?.addEventListener("input", (event) => {
    onSelectiveBloomStrengthChange(Number(event.target.value));
  });

  refs.cameraFovSlider?.addEventListener("input", (event) => {
    onCameraFovChange(Number(event.target.value));
  });

  refs.cameraHeightSlider?.addEventListener("input", (event) => {
    onCameraHeightChange(Number(event.target.value));
  });

  refs.showCrosshairToggle?.addEventListener("change", (event) => {
    onShowCrosshairChange(Boolean(event.target.checked));
  });

  refs.cameraShakeToggle?.addEventListener("change", (event) => {
    onCameraShakeChange(Boolean(event.target.checked));
  });

  refs.backgroundHueSlider?.addEventListener("input", (event) => {
    onBackgroundHueChange(Number(event.target.value));
  });

  refs.backgroundSaturationSlider?.addEventListener("input", (event) => {
    onBackgroundSaturationChange(Number(event.target.value));
  });

  refs.backgroundValueSlider?.addEventListener("input", (event) => {
    onBackgroundValueChange(Number(event.target.value));
  });

  refs.fireHueSlider?.addEventListener("input", (event) => {
    onFireHueChange(Number(event.target.value));
  });

  refs.fireSaturationSlider?.addEventListener("input", (event) => {
    onFireSaturationChange(Number(event.target.value));
  });

  refs.fireValueSlider?.addEventListener("input", (event) => {
    onFireValueChange(Number(event.target.value));
  });

  refs.reflectEnvIntensitySlider?.addEventListener("input", (event) => {
    onReflectEnvIntensityChange(Number(event.target.value));
  });

  refs.reflectIorSlider?.addEventListener("input", (event) => {
    onReflectIorChange(Number(event.target.value));
  });

  refs.reflectSpecularSlider?.addEventListener("input", (event) => {
    onReflectSpecularChange(Number(event.target.value));
  });

  refs.reflectMetalnessSlider?.addEventListener("input", (event) => {
    onReflectMetalnessChange(Number(event.target.value));
  });

  refs.baseLowMemoryToggle?.addEventListener("change", (event) => {
    onBaseLowMemoryToggle(Boolean(event.target.checked));
  });

  refs.baseTextureCapSelect?.addEventListener("change", (event) => {
    onBaseTextureCapChange(event.target.value);
  });

  refs.menuToggleButton?.addEventListener("click", () => {
    onMenuToggle();
  });

  refs.menuToggleButton?.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    onToggleDebugMode();
  });

  refs.menuToggleButton?.addEventListener("auxclick", (event) => {
    if (event.button !== 1) {
      return;
    }

    event.preventDefault();
    onToggleDebugMode();
  });

  refs.menuCloseButton?.addEventListener("click", () => {
    onMenuClose();
  });

  refs.reloadAssetsButton?.addEventListener("click", () => {
    onReloadAssets();
  });

  refs.exitDebugButton?.addEventListener("click", () => {
    onExitDebug();
  });
}

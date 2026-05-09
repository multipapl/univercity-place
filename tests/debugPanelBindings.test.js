import test from "node:test";
import assert from "node:assert/strict";

import { bindViewerUiEvents } from "../src/ui/debugPanelBindings.js";

function createInput(value = "") {
  const input = new EventTarget();
  input.value = value;
  return input;
}

function createButton() {
  const button = new EventTarget();
  button.blur = () => {};
  return button;
}

test("bindViewerUiEvents wires ambient audio volume input", () => {
  let capturedValue = null;
  const ambientAudioVolumeSlider = createInput("0.12");
  const cleanup = bindViewerUiEvents({
    refs: {
      ambientAudioVolumeSlider,
      menuToggleButton: createButton(),
      helpToggleButton: createButton(),
      bottomHelpToggleButton: createButton(),
      helpCloseButton: createButton(),
      helpFab: createButton(),
      reloadAssetsButton: createButton(),
      exitDebugButton: createButton(),
    },
    onExposureChange() {},
    onSelectiveBloomStrengthChange() {},
    onCameraFovChange() {},
    onCameraHeightChange() {},
    onAmbientAudioVolumeChange(value) {
      capturedValue = value;
    },
    onShowCrosshairChange() {},
    onCameraShakeChange() {},
    onBackgroundHueChange() {},
    onBackgroundSaturationChange() {},
    onBackgroundValueChange() {},
    onBackgroundGammaChange() {},
    onBackgroundReset() {},
    onSkyHueChange() {},
    onSkySaturationChange() {},
    onSkyValueChange() {},
    onSkyGammaChange() {},
    onSkyReset() {},
    onFireHueChange() {},
    onFireSaturationChange() {},
    onFireValueChange() {},
    onReflectEnvIntensityChange() {},
    onReflectIorChange() {},
    onReflectSpecularChange() {},
    onReflectEnvRotationYChange() {},
    onReflectReset() {},
    onBaseLowMemoryToggle() {},
    onRenderScaleChange() {},
    onMenuToggle() {},
    onHelpToggle() {},
    onHelpClose() {},
    onReloadAssets() {},
    onExitDebug() {},
  });

  ambientAudioVolumeSlider.dispatchEvent(new Event("input"));

  assert.equal(capturedValue, 0.12);
  cleanup();
});

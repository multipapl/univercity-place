import test from "node:test";
import assert from "node:assert/strict";

import { createViewerState } from "../src/viewer/createViewerState.js";

function createBaseViewerConfig() {
  return {
    colorPipeline: {
      toneMapping: "standard",
      exposure: 1.15,
    },
    interface: {
      showCrosshair: true,
    },
    camera: {
      ambientMotion: {
        enabled: true,
      },
    },
    locomotion: {
      mode: "walk",
    },
    postProcessing: {
      selectiveBloom: {
        strength: 0.6,
      },
    },
    runtimeOptimization: {
      lowMemoryBaseMipmaps: false,
      baseTextureMaxSize: 4096,
    },
    materialPresets: {
      background: {
        hueDegrees: 12,
        saturation: 0.8,
        value: 1.1,
        rotationDegreesPerMinute: 30,
      },
      fireVideo: {
        hueDegrees: -10,
        saturation: 1.25,
        value: 0.95,
      },
      reflectMaterial: {
        envMapIntensity: 1.5,
        ior: 1.3,
        specularIntensity: 0.45,
        defaultMetalness: 0.2,
        envMapRotationDegrees: 90,
      },
    },
  };
}

test("createViewerState initializes derived values and default UI state", () => {
  const state = createViewerState({
    baseViewerConfig: createBaseViewerConfig(),
    initialRuntimeOptimizationState: {
      lowMemoryBaseMipmaps: true,
      baseTextureMaxSize: 2048,
    },
  });

  assert.equal(state.runtimeOptimizationState.lowMemoryBaseMipmaps, true);
  assert.equal(state.runtimeOptimizationState.baseTextureMaxSize, 2048);
  assert.equal(state.helpOverlayState.isOpen, false);
  assert.equal(state.helpOverlayState.relockAfterClose, false);
  assert.equal(state.viewerLifecycle.animationFrameId, null);
  assert.equal(state.viewerLifecycle.timeoutId, null);
  assert.equal(state.viewerLifecycle.renderMode, "active");
  assert.equal(state.viewerLifecycle.renderRequested, false);
  assert.equal(state.viewerLifecycle.started, false);
  assert.equal(state.controlDockState.hideTimeout, null);
  assert.equal(
    state.backgroundState.rotationRadiansPerSecond,
    (30 * Math.PI / 180) / 60,
  );
  assert.equal(
    state.reflectionState.envMapRotationY,
    Math.PI / 2,
  );
});

test("createViewerState keeps live mutable state wired into viewerConfig", () => {
  const state = createViewerState({
    baseViewerConfig: createBaseViewerConfig(),
    initialRuntimeOptimizationState: {
      lowMemoryBaseMipmaps: false,
      baseTextureMaxSize: 4096,
    },
  });

  assert.equal(state.viewerConfig.colorPipeline, state.colorPipelineState);
  assert.equal(state.viewerConfig.interface, state.interfaceState);
  assert.equal(state.viewerConfig.runtimeOptimization, state.runtimeOptimizationState);
  assert.notEqual(state.viewerConfig.camera, createBaseViewerConfig().camera);

  state.colorPipelineState.exposure = 1.6;
  state.interfaceState.showCrosshair = false;
  state.runtimeOptimizationState.baseTextureMaxSize = 1024;

  assert.equal(state.viewerConfig.colorPipeline.exposure, 1.6);
  assert.equal(state.viewerConfig.interface.showCrosshair, false);
  assert.equal(state.viewerConfig.runtimeOptimization.baseTextureMaxSize, 1024);
});

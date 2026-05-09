import test from "node:test";
import assert from "node:assert/strict";
import { Euler, MeshPhysicalMaterial } from "three";

import { createViewerUiController } from "../src/viewer/createViewerUiController.js";

test("applyReflectMaterialSettings preserves GLB metalness", () => {
  const material = new MeshPhysicalMaterial({
    metalness: 0.6,
  });
  material.envMapRotation = new Euler();

  const state = {
    colorPipelineState: {
      toneMapping: "none",
      exposure: 1,
    },
    cameraMotionState: {
      enabled: false,
    },
    interfaceState: {
      showCrosshair: true,
    },
    backgroundState: {
      hueDegrees: 0,
      saturation: 1,
      value: 1,
      gamma: 1,
      materials: new Set(),
      roots: new Set(),
      motionTime: 0,
      rotationRadiansPerSecond: 0,
    },
    skyState: {
      hueDegrees: 0,
      saturation: 1,
      value: 1,
      gamma: 1,
      materials: new Set(),
    },
    fireState: {
      hueDegrees: 0,
      saturation: 1,
      value: 1,
      materials: new Set(),
    },
    reflectionState: {
      envMapIntensity: 1.2,
      ior: 1.5,
      specularIntensity: 0.75,
      envMapRotationY: Math.PI / 4,
      materials: new Set([material]),
      probeMaterials: new Set([material]),
    },
  };

  const controller = createViewerUiController({
    refs: {},
    nodes: {
      viewport: {
        clientWidth: 1,
        clientHeight: 1,
      },
      hud: {
        classList: {
          toggle() {},
        },
      },
      crosshair: {
        style: {},
      },
    },
    state,
  materialPipeline: {
      applyDebugColorCorrection() {},
    },
    renderer: {},
    selectiveBloomConfig: {
      strength: 0,
    },
    selectiveBloomPipeline: {
      applySettings() {},
      syncSize() {},
    },
    getEffectivePixelRatio() {
      return 1;
    },
    navigationController: {
      cameraState: {
        fov: 60,
        height: 1.6,
      },
      applyCameraSettings() {},
      clearCameraAmbientMotion() {},
      applyCameraAmbientMotion() {},
    },
    menuController: {
      setMode() {},
    },
    getDebugMode() {
      return false;
    },
    isTouchDevice: false,
  });

  controller.applyReflectMaterialSettings();

  assert.equal(material.metalness, 0.6);
  assert.equal(material.envMapIntensity, 1.2);
  assert.equal(material.ior, 1.5);
  assert.equal(material.specularIntensity, 0.75);
  assert.equal(material.envMapRotation.y, Math.PI / 4);
});

test("syncPostProcessingSize uses the effective pixel ratio getter", () => {
  let syncedSize = null;
  const controller = createViewerUiController({
    refs: {},
    nodes: {
      viewport: {
        clientWidth: 1280,
        clientHeight: 720,
      },
      hud: {
        classList: {
          toggle() {},
        },
      },
      crosshair: {
        style: {},
      },
    },
    state: {
      colorPipelineState: {
        toneMapping: "none",
        exposure: 1,
      },
      cameraMotionState: {
        enabled: false,
      },
      interfaceState: {
        showCrosshair: true,
      },
      runtimeOptimizationState: {
        renderScale: 0.5,
      },
      backgroundState: {
        hueDegrees: 0,
        saturation: 1,
        value: 1,
        gamma: 1,
        materials: new Set(),
        roots: new Set(),
        motionTime: 0,
        rotationRadiansPerSecond: 0,
      },
      skyState: {
        hueDegrees: 0,
        saturation: 1,
        value: 1,
        gamma: 1,
        materials: new Set(),
      },
      fireState: {
        hueDegrees: 0,
        saturation: 1,
        value: 1,
        materials: new Set(),
      },
      reflectionState: {
        envMapIntensity: 1,
        ior: 1.5,
        specularIntensity: 1,
        envMapRotationY: 0,
        materials: new Set(),
        probeMaterials: new Set(),
      },
    },
    viewerConfig: {
      materialPresets: {
        background: {
          hueDegrees: 0,
          saturation: 1,
          value: 1,
          gamma: 1,
        },
        sky: {
          hueDegrees: 0,
          saturation: 1,
          value: 1,
          gamma: 1,
        },
        reflectMaterial: {
          envMapIntensity: 1,
          ior: 1.5,
          specularIntensity: 1,
          envMapRotationDegrees: 0,
        },
      },
    },
    materialPipeline: {
      applyDebugColorCorrection() {},
    },
    renderer: {},
    selectiveBloomConfig: {
      strength: 0,
    },
    selectiveBloomPipeline: {
      applySettings() {},
      syncSize(width, height, pixelRatio) {
        syncedSize = { width, height, pixelRatio };
      },
    },
    getEffectivePixelRatio() {
      return 1.25;
    },
    navigationController: {
      cameraState: {
        fov: 60,
        height: 1.6,
      },
      applyCameraSettings() {},
      clearCameraAmbientMotion() {},
      applyCameraAmbientMotion() {},
    },
    menuController: {
      setMode() {},
    },
    getDebugMode() {
      return false;
    },
    isTouchDevice: false,
  });

  controller.syncPostProcessingSize();

  assert.deepEqual(syncedSize, {
    width: 1280,
    height: 720,
    pixelRatio: 1.25,
  });
});

test("applyViewportColorSettings keeps view transform fixed to none", () => {
  const renderer = {
    toneMapping: null,
    toneMappingExposure: 0,
  };
  const state = {
    colorPipelineState: {
      toneMapping: "standard",
      exposure: 1.35,
    },
    cameraMotionState: {
      enabled: false,
    },
    interfaceState: {
      showCrosshair: true,
    },
    runtimeOptimizationState: {
      renderScale: 1,
    },
    backgroundState: {
      hueDegrees: 0,
      saturation: 1,
      value: 1,
      gamma: 1,
      materials: new Set(),
      roots: new Set(),
      motionTime: 0,
      rotationRadiansPerSecond: 0,
    },
    skyState: {
      hueDegrees: 0,
      saturation: 1,
      value: 1,
      gamma: 1,
      materials: new Set(),
    },
    fireState: {
      hueDegrees: 0,
      saturation: 1,
      value: 1,
      materials: new Set(),
    },
    reflectionState: {
      envMapIntensity: 1,
      ior: 1.5,
      specularIntensity: 1,
      envMapRotationY: 0,
      materials: new Set(),
      probeMaterials: new Set(),
    },
  };

  const controller = createViewerUiController({
    refs: {},
    nodes: {
      viewport: {
        clientWidth: 1,
        clientHeight: 1,
      },
      hud: {
        classList: {
          toggle() {},
        },
      },
      crosshair: {
        style: {},
      },
    },
    state,
    viewerConfig: {
      materialPresets: {
        background: {
          hueDegrees: 0,
          saturation: 1,
          value: 1,
          gamma: 1,
        },
        sky: {
          hueDegrees: 0,
          saturation: 1,
          value: 1,
          gamma: 1,
        },
        reflectMaterial: {
          envMapIntensity: 1,
          ior: 1.5,
          specularIntensity: 1,
          envMapRotationDegrees: 0,
        },
      },
    },
    materialPipeline: {
      applyDebugColorCorrection() {},
    },
    renderer,
    selectiveBloomConfig: {
      strength: 0,
    },
    selectiveBloomPipeline: {
      applySettings() {},
      syncSize() {},
    },
    navigationController: {
      cameraState: {
        fov: 60,
        height: 1.6,
      },
      applyCameraSettings() {},
      clearCameraAmbientMotion() {},
      applyCameraAmbientMotion() {},
    },
    menuController: {
      setMode() {},
    },
    getDebugMode() {
      return false;
    },
    isTouchDevice: false,
  });

  controller.applyViewportColorSettings();

  assert.equal(state.colorPipelineState.toneMapping, "none");
  assert.equal(renderer.toneMappingExposure, 1.35);
});

test("applyAmbientAudioSettings syncs the UI and audio controller volume", () => {
  let appliedVolume = null;
  const refs = {
    ambientAudioVolumeSlider: {
      value: "",
    },
    ambientAudioVolumeValue: {
      value: "",
      textContent: "",
    },
  };
  const controller = createViewerUiController({
    refs,
    nodes: {
      viewport: {
        clientWidth: 1,
        clientHeight: 1,
      },
      hud: {
        classList: {
          toggle() {},
        },
      },
      crosshair: {
        style: {},
      },
    },
    state: {
      colorPipelineState: {
        toneMapping: "none",
        exposure: 1,
      },
      cameraMotionState: {
        enabled: false,
      },
      ambientAudioState: {
        volume: 0.06,
      },
      interfaceState: {
        showCrosshair: true,
      },
      runtimeOptimizationState: {
        renderScale: 1,
      },
      backgroundState: {
        hueDegrees: 0,
        saturation: 1,
        value: 1,
        gamma: 1,
        materials: new Set(),
        roots: new Set(),
        motionTime: 0,
        rotationRadiansPerSecond: 0,
      },
      skyState: {
        hueDegrees: 0,
        saturation: 1,
        value: 1,
        gamma: 1,
        materials: new Set(),
      },
      fireState: {
        hueDegrees: 0,
        saturation: 1,
        value: 1,
        materials: new Set(),
      },
      reflectionState: {
        envMapIntensity: 1,
        ior: 1.5,
        specularIntensity: 1,
        envMapRotationY: 0,
        materials: new Set(),
        probeMaterials: new Set(),
      },
    },
    viewerConfig: {
      materialPresets: {
        background: {
          hueDegrees: 0,
          saturation: 1,
          value: 1,
          gamma: 1,
        },
        sky: {
          hueDegrees: 0,
          saturation: 1,
          value: 1,
          gamma: 1,
        },
        reflectMaterial: {
          envMapIntensity: 1,
          ior: 1.5,
          specularIntensity: 1,
          envMapRotationDegrees: 0,
        },
      },
    },
    materialPipeline: {
      applyDebugColorCorrection() {},
    },
    renderer: {},
    selectiveBloomConfig: {
      strength: 0,
    },
    selectiveBloomPipeline: {
      applySettings() {},
      syncSize() {},
    },
    navigationController: {
      cameraState: {
        fov: 60,
        height: 1.6,
      },
      applyCameraSettings() {},
      clearCameraAmbientMotion() {},
      applyCameraAmbientMotion() {},
    },
    menuController: {
      setMode() {},
    },
    getDebugMode() {
      return false;
    },
    isTouchDevice: false,
    ambientAudioController: {
      setVolume(value) {
        appliedVolume = value;
      },
    },
  });

  controller.applyAmbientAudioSettings();

  assert.equal(refs.ambientAudioVolumeSlider.value, "0.06");
  assert.equal(refs.ambientAudioVolumeValue.textContent, "0.06");
  assert.equal(appliedVolume, 0.06);
});

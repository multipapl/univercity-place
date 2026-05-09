import { buildHelpOverlayMarkup } from "./helpOverlayContent.js";
import { createBottomDock } from "./bottomDock.js";
import { createLeftSidebar } from "./leftSidebar.js";

function collectViewerShellRefs({ hud, loadingScreen, mobileControls }) {
  return {
    statusLine: hud.querySelector("[data-status]"),
    loadingStatusLine: loadingScreen.querySelector("[data-loading-status]"),
    loadingBarFill: loadingScreen.querySelector("[data-loading-bar-fill]"),
    helpFab: hud.querySelector("[data-help-fab]"),
    controlDock: hud.querySelector(".control-dock"),
    menuToggleButton: hud.querySelector("[data-menu-toggle]"),
    helpToggleButton: hud.querySelector("[data-help-toggle]"),
    helpOverlay: hud.querySelector("[data-help-overlay]"),
    helpCloseButton: hud.querySelector("[data-help-close]"),
    bottomDock: hud.querySelector("[data-bottom-dock]"),
    bottomDockCategories: hud.querySelector("[data-bottom-dock-categories]"),
    bottomDockDebugIndicator: hud.querySelector("[data-debug-indicator]"),
    bottomHelpToggleButton: hud.querySelector("[data-bottom-help-toggle]"),
    leftSidebar: hud.querySelector("[data-left-sidebar]"),
    sidebarTitle: hud.querySelector("[data-sidebar-title]"),
    sidebarPanels: hud.querySelector("[data-sidebar-panels]"),
    quickFpsValue: hud.querySelector("[data-quick-fps-value]"),
    quickCameraFovValue: hud.querySelector("[data-quick-camera-fov-value]"),
    quickCameraHeightValue: hud.querySelector("[data-quick-camera-height-value]"),
    bottomQuickFpsValue: hud.querySelector("[data-bottom-quick-fps-value]"),
    bottomQuickCameraFovValue: hud.querySelector("[data-bottom-quick-camera-fov-value]"),
    bottomQuickCameraHeightValue: hud.querySelector("[data-bottom-quick-camera-height-value]"),
    toneMappingSelect: hud.querySelector("[data-tone-mapping]"),
    exposureSlider: hud.querySelector("[data-exposure]"),
    exposureValue: hud.querySelector("[data-exposure-value]"),
    selectiveBloomStrengthSlider: hud.querySelector("[data-selective-bloom-strength]"),
    selectiveBloomStrengthValue: hud.querySelector("[data-selective-bloom-strength-value]"),
    cameraFovSlider: hud.querySelector("[data-camera-fov]"),
    cameraFovValue: hud.querySelector("[data-camera-fov-value]"),
    cameraHeightSlider: hud.querySelector("[data-camera-height]"),
    cameraHeightValue: hud.querySelector("[data-camera-height-value]"),
    showCrosshairToggle: hud.querySelector("[data-show-crosshair]"),
    cameraShakeToggle: hud.querySelector("[data-camera-shake]"),
    backgroundHueSlider: hud.querySelector("[data-background-hue]"),
    backgroundHueValue: hud.querySelector("[data-background-hue-value]"),
    backgroundSaturationSlider: hud.querySelector("[data-background-saturation]"),
    backgroundSaturationValue: hud.querySelector("[data-background-saturation-value]"),
    backgroundValueSlider: hud.querySelector("[data-background-value]"),
    backgroundValueOutput: hud.querySelector("[data-background-value-output]"),
    backgroundGammaSlider: hud.querySelector("[data-background-gamma]"),
    backgroundGammaValue: hud.querySelector("[data-background-gamma-value]"),
    backgroundResetButton: hud.querySelector("[data-background-reset]"),
    skyHueSlider: hud.querySelector("[data-sky-hue]"),
    skyHueValue: hud.querySelector("[data-sky-hue-value]"),
    skySaturationSlider: hud.querySelector("[data-sky-saturation]"),
    skySaturationValue: hud.querySelector("[data-sky-saturation-value]"),
    skyValueSlider: hud.querySelector("[data-sky-value]"),
    skyValueOutput: hud.querySelector("[data-sky-value-output]"),
    skyGammaSlider: hud.querySelector("[data-sky-gamma]"),
    skyGammaValue: hud.querySelector("[data-sky-gamma-value]"),
    skyResetButton: hud.querySelector("[data-sky-reset]"),
    fireHueSlider: hud.querySelector("[data-fire-hue]"),
    fireHueValue: hud.querySelector("[data-fire-hue-value]"),
    fireSaturationSlider: hud.querySelector("[data-fire-saturation]"),
    fireSaturationValue: hud.querySelector("[data-fire-saturation-value]"),
    fireValueSlider: hud.querySelector("[data-fire-value]"),
    fireValueOutput: hud.querySelector("[data-fire-value-output]"),
    reflectEnvIntensitySlider: hud.querySelector("[data-reflect-env-intensity]"),
    reflectEnvIntensityValue: hud.querySelector("[data-reflect-env-intensity-value]"),
    reflectIorSlider: hud.querySelector("[data-reflect-ior]"),
    reflectIorValue: hud.querySelector("[data-reflect-ior-value]"),
    reflectSpecularSlider: hud.querySelector("[data-reflect-specular]"),
    reflectSpecularValue: hud.querySelector("[data-reflect-specular-value]"),
    reflectMetalnessSlider: hud.querySelector("[data-reflect-metalness]"),
    reflectMetalnessValue: hud.querySelector("[data-reflect-metalness-value]"),
    reflectEnvRotationYSlider: hud.querySelector("[data-reflect-env-rotation-y]"),
    reflectEnvRotationYValue: hud.querySelector("[data-reflect-env-rotation-y-value]"),
    reflectResetButton: hud.querySelector("[data-reflect-reset]"),
    layerControls: hud.querySelector("[data-layer-controls]"),
    statFps: hud.querySelector("[data-stat-fps]"),
    statFrameMs: hud.querySelector("[data-stat-frame-ms]"),
    statDrawCalls: hud.querySelector("[data-stat-draw-calls]"),
    statTriangles: hud.querySelector("[data-stat-triangles]"),
    statTextures: hud.querySelector("[data-stat-textures]"),
    statTextureMemory: hud.querySelector("[data-stat-texture-memory]"),
    baseLowMemoryToggle: hud.querySelector("[data-base-low-memory]"),
    baseTextureCapSelect: hud.querySelector("[data-base-texture-cap]"),
    renderScaleSlider: hud.querySelector("[data-render-scale]"),
    renderScaleValue: hud.querySelector("[data-render-scale-value]"),
    reloadAssetsButton: hud.querySelector("[data-reload-assets]"),
    exitDebugButton: hud.querySelector("[data-exit-debug]"),
    objectSelectionHint: hud.querySelector("[data-object-selection-hint]"),
    pickObjectButton: hud.querySelector("[data-pick-object]"),
    resetObjectOverrideButton: hud.querySelector("[data-reset-object-override]"),
    selectedLayerId: hud.querySelector("[data-selected-layer-id]"),
    selectedMeshName: hud.querySelector("[data-selected-mesh-name]"),
    selectedMaterialName: hud.querySelector("[data-selected-material-name]"),
    selectedTargetSupport: hud.querySelector("[data-selected-target-support]"),
    objectHueSlider: hud.querySelector("[data-object-hue]"),
    objectHueValue: hud.querySelector("[data-object-hue-value]"),
    objectSaturationSlider: hud.querySelector("[data-object-saturation]"),
    objectSaturationValue: hud.querySelector("[data-object-saturation-value]"),
    objectValueSlider: hud.querySelector("[data-object-value]"),
    objectValueValue: hud.querySelector("[data-object-value-value]"),
    objectGammaSlider: hud.querySelector("[data-object-gamma]"),
    objectGammaValue: hud.querySelector("[data-object-gamma-value]"),
    copyObjectOverridesButton: hud.querySelector("[data-copy-object-overrides]"),
    saveObjectOverridesButton: hud.querySelector("[data-save-object-overrides]"),
    objectOverridesStatus: hud.querySelector("[data-object-overrides-status]"),
    galleryOverlay: hud.querySelector("[data-gallery-overlay]"),
    joystickBase: mobileControls.querySelector("[data-joystick]"),
    joystickThumb: mobileControls.querySelector("[data-joystick-thumb]"),
    lookPad: mobileControls.querySelector("[data-lookpad]"),
    flyUpButton: mobileControls.querySelector("[data-fly-up]"),
    flyDownButton: mobileControls.querySelector("[data-fly-down]"),
    boostButton: mobileControls.querySelector("[data-boost]"),
  };
}

export function createViewerShell({
  app,
  isTouchDevice,
  isWalkMode,
  menuMode,
  viewerConfig,
  sceneLoadStatusHtml,
  loadingBackgroundUrl,
}) {
  const viewport = document.createElement("div");
  viewport.className = "viewport";

  const hud = document.createElement("div");
  hud.className = "hud";
  hud.innerHTML = `
    <button type="button" class="help-fab" data-help-fab aria-label="Press H for help" title="Press H for help">
      ?
    </button>
    <div class="control-dock">
      <div class="dock-actions">
        <button type="button" class="menu-toggle" data-menu-toggle aria-expanded="false" tabindex="-1">
          <span>Menu</span>
          <kbd>M</kbd>
        </button>
        <button type="button" class="menu-toggle is-secondary" data-help-toggle aria-expanded="false" tabindex="-1">
          <span>Help</span>
          <kbd>H</kbd>
        </button>
      </div>
      <div class="dock-readouts">
        <div class="dock-readout">
          <span>FPS</span>
          <strong data-quick-fps-value>0</strong>
          <small>Live</small>
        </div>
        <div class="dock-readout">
          <span>FOV</span>
          <strong data-quick-camera-fov-value>${viewerConfig.camera.fov.toFixed(0)}&deg;</strong>
          <small>Shift + Wheel</small>
        </div>
        <div class="dock-readout">
          <span>Height</span>
          <strong data-quick-camera-height-value>${viewerConfig.camera.height.toFixed(2)}</strong>
          <small>Q / E</small>
        </div>
      </div>
    </div>
    <p class="hud-status" data-status>${sceneLoadStatusHtml}</p>
    <div class="help-overlay" data-help-overlay hidden>
      ${buildHelpOverlayMarkup({
        isTouchDevice,
        isWalkMode,
      })}
    </div>
  `;

  const {
    dock: bottomDock,
    categoriesContainer: bottomDockCategories,
    debugIndicator: bottomDockDebugIndicator,
  } = createBottomDock({
    menuMode,
    viewerConfig,
  });

  const {
    sidebar: leftSidebar,
    titleElement: sidebarTitle,
    panelsElement: sidebarPanels,
  } = createLeftSidebar({
    viewerConfig,
  });

  const galleryOverlayElement = document.createElement("div");
  galleryOverlayElement.className = "gallery-overlay";
  galleryOverlayElement.dataset.galleryOverlay = "";
  galleryOverlayElement.hidden = true;
  galleryOverlayElement.innerHTML = `
    <div class="gallery-header">
      <span class="gallery-counter" data-gallery-counter></span>
      <button type="button" class="gallery-close" data-gallery-close aria-label="Close gallery"></button>
    </div>
    <div class="gallery-body">
      <button type="button" class="gallery-nav-btn gallery-nav-prev" data-gallery-prev disabled aria-label="Previous"></button>
      <div class="gallery-stage" data-gallery-stage></div>
      <button type="button" class="gallery-nav-btn gallery-nav-next" data-gallery-next disabled aria-label="Next"></button>
    </div>
  `;

  hud.append(bottomDock, leftSidebar, galleryOverlayElement);

  const loadingScreen = document.createElement("div");
  loadingScreen.className = "loading-screen is-visible";
  if (loadingBackgroundUrl) {
    loadingScreen.style.setProperty("--loading-bg", `url(${loadingBackgroundUrl})`);
  }
  loadingScreen.innerHTML = `
    <h1 class="loading-title">University Place</h1>
    <p class="loading-status" data-loading-status>${sceneLoadStatusHtml}</p>
    <div class="loading-bar" aria-hidden="true">
      <span class="loading-bar-fill is-indeterminate" data-loading-bar-fill></span>
    </div>
  `;

  const crosshair = document.createElement("div");
  crosshair.className = "crosshair";

  const mobileControls = document.createElement("div");
  mobileControls.className = `mobile-controls${isTouchDevice ? " is-visible" : ""}`;
  mobileControls.innerHTML = `
    <div class="joystick-shell">
      <div class="joystick" data-joystick>
        <div class="joystick-thumb" data-joystick-thumb></div>
      </div>
    </div>
    <div class="lookpad" data-lookpad>
      <span>Look</span>
    </div>
    <div class="mobile-buttons">
      ${isWalkMode ? "" : '<button type="button" data-fly-up>Up</button><button type="button" data-fly-down>Down</button>'}
      <button type="button" data-boost>${isWalkMode ? "Sprint" : "Boost"}</button>
    </div>
  `;

  viewport.append(loadingScreen, hud, crosshair, mobileControls);
  app.append(viewport);

  return {
    nodes: {
      app,
      viewport,
      hud,
      loadingScreen,
      crosshair,
      mobileControls,
    },
    refs: collectViewerShellRefs({
      hud,
      loadingScreen,
      mobileControls,
    }),
  };
}

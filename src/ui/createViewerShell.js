import { buildHelpOverlayMarkup } from "./helpOverlayContent.js";
import { createBottomDock } from "./bottomDock.js";
import { createLeftSidebar } from "./leftSidebar.js";

export function createViewerShell({
  app,
  isTouchDevice,
  isWalkMode,
  menuMode,
  viewerConfig,
  sceneLoadStatusHtml,
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

  hud.append(bottomDock, leftSidebar);

  const loadingScreen = document.createElement("div");
  loadingScreen.className = "loading-screen is-visible";
  loadingScreen.innerHTML = `
    <div class="loading-card">
      <p class="loading-kicker">University Place</p>
      <h1>Loading Scene</h1>
      <p class="loading-copy" data-loading-status>${sceneLoadStatusHtml}</p>
      <div class="loading-bar" aria-hidden="true">
        <span class="loading-bar-fill is-indeterminate" data-loading-bar-fill></span>
      </div>
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
    viewport,
    hud,
    bottomDock,
    bottomDockCategories,
    bottomDockDebugIndicator,
    leftSidebar,
    sidebarTitle,
    sidebarPanels,
    loadingScreen,
    crosshair,
    mobileControls,
  };
}

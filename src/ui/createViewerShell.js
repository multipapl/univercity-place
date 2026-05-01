import { buildMenuSectionsMarkup } from "./menuSections.js";
import { buildHelpOverlayMarkup } from "./helpOverlayContent.js";

export function createViewerShell({
  app,
  isTouchDevice,
  isWalkMode,
  menuMode,
  viewerConfig,
  sceneLoadStatusHtml,
  desktopControlText,
  touchControlText,
}) {
  const viewport = document.createElement("div");
  viewport.className = "viewport";

  const hud = document.createElement("div");
  hud.className = "hud";
  hud.innerHTML = `
    <div class="control-dock">
      <div class="dock-actions">
        <button type="button" class="menu-toggle" data-menu-toggle aria-expanded="false">
          <span data-menu-toggle-label>${menuMode === "debug" ? "Debug Menu" : "Controls"}</span>
          <kbd>M</kbd>
        </button>
        <button type="button" class="menu-toggle is-secondary" data-help-toggle aria-expanded="false">
          <span>Help</span>
          <kbd>H</kbd>
        </button>
      </div>
      <div class="dock-readouts">
        <div class="dock-readout">
          <span>Exposure</span>
          <strong data-quick-exposure-value>${viewerConfig.colorPipeline.exposure.toFixed(2)}</strong>
          <small>Drawer</small>
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
    <div class="hud-panel" data-hud-panel hidden>
      <div class="hud-header">
        <div>
          <p class="panel-kicker">${menuMode === "debug" ? "Debug Controls" : "Viewer Controls"}</p>
          <h1>${menuMode === "debug" ? "Tune the scene without losing flow" : "Keep the scene readable and easy to tune"}</h1>
          <p>${isTouchDevice
            ? `Touch controls are enabled for mobile ${isWalkMode ? "walking" : "flight"}.`
            : "Menu pauses controls so you can tune the scene without fighting pointer lock."}</p>
        </div>
        <button type="button" class="menu-close" data-menu-close aria-label="Close menu">Close</button>
      </div>
      <p class="status" data-status>${sceneLoadStatusHtml}</p>
      <div class="hud-topline">
        <p class="hud-controls-copy">${isTouchDevice ? touchControlText : desktopControlText}</p>
        <div class="hotkey-strip">
          <span><kbd>Q</kbd><kbd>E</kbd> height</span>
          <span><kbd>Shift</kbd> + <kbd>Wheel</kbd> FOV</span>
          <span><kbd>H</kbd> help</span>
        </div>
      </div>
      <div class="hud-summary">
        <div class="section-heading">
          <h2>Live Stats</h2>
          <p>The essentials stay visible up top so the drawer can stay compact.</p>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <span>FPS</span>
            <strong data-stat-fps>0</strong>
          </div>
          <div class="stat-card">
            <span>Frame</span>
            <strong data-stat-frame-ms>0.0 ms</strong>
          </div>
          <div class="stat-card">
            <span>Draw Calls</span>
            <strong data-stat-draw-calls>0</strong>
          </div>
          <div class="stat-card">
            <span>Triangles</span>
            <strong data-stat-triangles>0</strong>
          </div>
        </div>
      </div>
      <div class="menu-sections" data-menu-sections>
        ${buildMenuSectionsMarkup({ menuMode, viewerConfig })}
      </div>
    </div>
    <div class="help-overlay" data-help-overlay hidden>
      ${buildHelpOverlayMarkup({
        isTouchDevice,
        isWalkMode,
      })}
    </div>
  `;

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
    loadingScreen,
    crosshair,
    mobileControls,
  };
}

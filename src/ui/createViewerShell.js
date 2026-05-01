import { buildMenuSectionsMarkup } from "./menuSections.js";

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
    <button type="button" class="menu-toggle" data-menu-toggle aria-expanded="false">
      <span data-menu-toggle-label>${menuMode === "debug" ? "Debug Menu" : "Menu"}</span>
      <kbd>M</kbd>
    </button>
    <div class="hud-panel" data-hud-panel hidden>
      <div class="hud-header">
        <div>
          <h1>${menuMode === "debug" ? "Debug Menu" : "Viewer Menu"}</h1>
          <p>${isTouchDevice
            ? `Touch controls are enabled for mobile ${isWalkMode ? "walking" : "flight"}.`
            : "Menu pauses controls so you can tune the scene without fighting pointer lock."}</p>
        </div>
        <button type="button" class="menu-close" data-menu-close aria-label="Close menu">Close</button>
      </div>
      <p class="status" data-status>${sceneLoadStatusHtml}</p>
      <p class="hud-controls-copy">${isTouchDevice ? touchControlText : desktopControlText}</p>
      <div class="hud-summary">
        <h2>Stats</h2>
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

export function createViewerShell({
  app,
  isTouchDevice,
  isWalkMode,
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
      <span>Menu</span>
      <kbd>M</kbd>
    </button>
    <div class="hud-panel" data-hud-panel hidden>
      <div class="hud-header">
        <div>
          <h1>Viewer Menu</h1>
          <p>${isTouchDevice
            ? `Touch controls are enabled for mobile ${isWalkMode ? "walking" : "flight"}.`
            : "Menu pauses controls so you can tune the scene without fighting pointer lock."}</p>
        </div>
        <button type="button" class="menu-close" data-menu-close aria-label="Close menu">Close</button>
      </div>
      <p class="status" data-status>${sceneLoadStatusHtml}</p>
      <p>${isTouchDevice ? touchControlText : desktopControlText}</p>
      <div class="menu-section">
        <h2>Viewport</h2>
        <div class="color-tools">
          <label class="field field-range">
            <span>Exposure</span>
            <input type="range" min="0.25" max="2.5" step="0.01" value="${viewerConfig.colorPipeline.exposure}" data-exposure />
            <output data-exposure-value>${viewerConfig.colorPipeline.exposure.toFixed(2)}</output>
          </label>
          <label class="field field-range">
            <span>Selective Bloom</span>
            <input type="range" min="0" max="3" step="0.01" value="${viewerConfig.postProcessing.selectiveBloom.strength}" data-selective-bloom-strength />
            <output data-selective-bloom-strength-value>${viewerConfig.postProcessing.selectiveBloom.strength.toFixed(2)}</output>
          </label>
          <label class="field field-range">
            <span>FOV</span>
            <input type="range" min="30" max="110" step="1" value="${viewerConfig.camera.fov}" data-camera-fov />
            <output data-camera-fov-value>${viewerConfig.camera.fov.toFixed(0)}&deg;</output>
          </label>
          <label class="field field-range">
            <span>Camera Height</span>
            <input type="range" min="0.5" max="2.5" step="0.01" value="${viewerConfig.camera.height}" data-camera-height />
            <output data-camera-height-value>${viewerConfig.camera.height.toFixed(2)}</output>
          </label>
          <label class="layer-toggle">
            <input type="checkbox" data-show-crosshair ${viewerConfig.interface.showCrosshair ? "checked" : ""} />
            <span class="layer-toggle-copy">
              <strong>Show Crosshair</strong>
              <small>Toggle the center reticle on desktop.</small>
            </span>
          </label>
          <label class="layer-toggle">
            <input type="checkbox" data-camera-shake ${viewerConfig.camera.ambientMotion.enabled ? "checked" : ""} />
            <span class="layer-toggle-copy">
              <strong>Camera Shake</strong>
              <small>Toggle the subtle ambient camera drift.</small>
            </span>
          </label>
        </div>
      </div>
      <div class="menu-section">
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
      <div class="menu-section" data-debug-only>
        <h2>Viewport Advanced</h2>
        <div class="color-tools">
          <label class="field">
            <span>View Transform</span>
            <select data-tone-mapping>
              <option value="standard">Standard</option>
              <option value="none">None</option>
            </select>
          </label>
        </div>
      </div>
      <div class="menu-section" data-debug-only>
        <h2>Background</h2>
        <div class="color-tools">
          <label class="field field-range">
            <span>Hue</span>
            <input type="range" min="-180" max="180" step="1" value="${viewerConfig.materialPresets.background.hueDegrees}" data-background-hue />
            <output data-background-hue-value>${viewerConfig.materialPresets.background.hueDegrees.toFixed(0)}&deg;</output>
          </label>
          <label class="field field-range">
            <span>Saturation</span>
            <input type="range" min="0" max="2" step="0.01" value="${viewerConfig.materialPresets.background.saturation}" data-background-saturation />
            <output data-background-saturation-value>${viewerConfig.materialPresets.background.saturation.toFixed(2)}</output>
          </label>
          <label class="field field-range">
            <span>Value</span>
            <input type="range" min="0" max="2" step="0.01" value="${viewerConfig.materialPresets.background.value}" data-background-value />
            <output data-background-value-output>${viewerConfig.materialPresets.background.value.toFixed(2)}</output>
          </label>
        </div>
      </div>
      <div class="menu-section" data-debug-only>
        <h2>Fire</h2>
        <div class="color-tools">
          <label class="field field-range">
            <span>Hue</span>
            <input type="range" min="-180" max="180" step="1" value="${viewerConfig.materialPresets.fireVideo.hueDegrees}" data-fire-hue />
            <output data-fire-hue-value>${viewerConfig.materialPresets.fireVideo.hueDegrees.toFixed(0)}&deg;</output>
          </label>
          <label class="field field-range">
            <span>Saturation</span>
            <input type="range" min="0" max="2" step="0.01" value="${viewerConfig.materialPresets.fireVideo.saturation}" data-fire-saturation />
            <output data-fire-saturation-value>${viewerConfig.materialPresets.fireVideo.saturation.toFixed(2)}</output>
          </label>
          <label class="field field-range">
            <span>Value</span>
            <input type="range" min="0" max="2" step="0.01" value="${viewerConfig.materialPresets.fireVideo.value}" data-fire-value />
            <output data-fire-value-output>${viewerConfig.materialPresets.fireVideo.value.toFixed(2)}</output>
          </label>
        </div>
      </div>
      <div class="menu-section" data-debug-only>
        <h2>Reflect</h2>
        <div class="color-tools">
          <label class="field field-range">
            <span>Env Intensity</span>
            <input type="range" min="0" max="4" step="0.01" value="${viewerConfig.materialPresets.reflectMaterial.envMapIntensity}" data-reflect-env-intensity />
            <output data-reflect-env-intensity-value>${viewerConfig.materialPresets.reflectMaterial.envMapIntensity.toFixed(2)}</output>
          </label>
          <label class="field field-range">
            <span>IOR</span>
            <input type="range" min="1" max="2.5" step="0.01" value="${viewerConfig.materialPresets.reflectMaterial.ior}" data-reflect-ior />
            <output data-reflect-ior-value>${viewerConfig.materialPresets.reflectMaterial.ior.toFixed(2)}</output>
          </label>
          <label class="field field-range">
            <span>Specular</span>
            <input type="range" min="0" max="1" step="0.01" value="${viewerConfig.materialPresets.reflectMaterial.specularIntensity}" data-reflect-specular />
            <output data-reflect-specular-value>${viewerConfig.materialPresets.reflectMaterial.specularIntensity.toFixed(2)}</output>
          </label>
          <label class="field field-range">
            <span>Metalness</span>
            <input type="range" min="0" max="1" step="0.01" value="${viewerConfig.materialPresets.reflectMaterial.defaultMetalness}" data-reflect-metalness />
            <output data-reflect-metalness-value>${viewerConfig.materialPresets.reflectMaterial.defaultMetalness.toFixed(2)}</output>
          </label>
        </div>
      </div>
      <div class="menu-section" data-debug-only>
        <h2>Layers</h2>
        <div class="layer-controls" data-layer-controls>
          <p class="empty-state">Layers will appear here after scene load.</p>
        </div>
      </div>
      <div class="menu-section" data-debug-only>
        <h2>Object Inspector</h2>
        <div class="layer-controls">
          <p class="debug-note" data-object-selection-hint>No object selected yet. Click Pick Object, then click the scene.</p>
          <div class="button-row">
            <button type="button" class="action-button" data-pick-object>Pick Object</button>
            <button type="button" class="action-button is-secondary" data-reset-object-override>Reset Selected</button>
          </div>
          <div class="debug-target-card">
            <div class="debug-target-row"><span>Layer</span><strong data-selected-layer-id>None</strong></div>
            <div class="debug-target-row"><span>Mesh</span><strong data-selected-mesh-name>None</strong></div>
            <div class="debug-target-row"><span>Material</span><strong data-selected-material-name>None</strong></div>
            <div class="debug-target-row"><span>Status</span><strong data-selected-target-support>No target</strong></div>
          </div>
          <div class="color-tools">
            <label class="field field-range">
              <span>Hue</span>
              <input type="range" min="-180" max="180" step="1" value="0" data-object-hue />
              <output data-object-hue-value>0&deg;</output>
            </label>
            <label class="field field-range">
              <span>Saturation</span>
              <input type="range" min="0" max="4" step="0.02" value="1" data-object-saturation />
              <output data-object-saturation-value>1.00</output>
            </label>
            <label class="field field-range">
              <span>Value</span>
              <input type="range" min="0" max="4" step="0.02" value="1" data-object-value />
              <output data-object-value-value>1.00</output>
            </label>
            <label class="field field-range">
              <span>Gamma</span>
              <input type="range" min="0.25" max="4" step="0.02" value="1" data-object-gamma />
              <output data-object-gamma-value>1.00</output>
            </label>
          </div>
          <div class="button-row">
            <button type="button" class="action-button" data-copy-object-overrides>Copy Overrides JSON</button>
            <button type="button" class="action-button is-secondary" data-save-object-overrides>Save Overrides JSON</button>
          </div>
          <p class="debug-note" data-object-overrides-status>Local object overrides will appear here.</p>
        </div>
      </div>
      <div class="menu-section" data-debug-only>
        <h2>Session</h2>
        <div class="layer-controls">
          <p class="debug-note" data-debug-session-note>Debug tools are active for this URL.</p>
          <div class="button-row">
            <button type="button" class="action-button" data-reload-assets>Reload Assets</button>
            <button type="button" class="action-button is-secondary" data-exit-debug>Exit Debug</button>
          </div>
        </div>
      </div>
      <div class="menu-section" data-debug-only>
        <h2>Performance</h2>
        <div class="layer-controls">
          <label class="layer-toggle">
            <input type="checkbox" data-base-low-memory />
            <span class="layer-toggle-copy">
              <strong>Low-memory base textures</strong>
              <small>Disables mipmaps on the baked base layer to reduce texture VRAM at the cost of distance quality.</small>
            </span>
          </label>
          <label class="field">
            <span>Base Texture Cap</span>
            <select data-base-texture-cap>
              <option value="0">Off</option>
              <option value="4096">4096</option>
              <option value="3072">3072</option>
              <option value="2048">2048</option>
              <option value="1024">1024</option>
            </select>
          </label>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <span>Textures</span>
            <strong data-stat-textures>0</strong>
          </div>
          <div class="stat-card">
            <span>Texture VRAM</span>
            <strong data-stat-texture-memory>0 MB</strong>
          </div>
        </div>
        <p class="performance-note" data-performance-note>Approximate runtime view for the currently visible layers.</p>
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

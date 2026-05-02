export const DOCK_CATEGORIES = [
  {
    id: "viewport",
    label: "Viewport",
    items: [
      {
        id: "viewport-settings",
        label: "Settings",
        modes: ["viewer", "debug"],
        render: ({ viewerConfig }) => `
          <div class="color-tools">
            <label class="field field-range">
              <span>Exposure</span>
              <input type="range" name="exposure" min="0.25" max="2.5" step="0.01" value="${viewerConfig.colorPipeline.exposure}" data-exposure />
              <output data-exposure-value>${viewerConfig.colorPipeline.exposure.toFixed(2)}</output>
            </label>
            <label class="field field-range">
              <span>Selective Bloom</span>
              <input type="range" name="selective-bloom-strength" min="0" max="3" step="0.01" value="${viewerConfig.postProcessing.selectiveBloom.strength}" data-selective-bloom-strength />
              <output data-selective-bloom-strength-value>${viewerConfig.postProcessing.selectiveBloom.strength.toFixed(2)}</output>
            </label>
            <label class="field field-range">
              <span>FOV</span>
              <input type="range" name="camera-fov" min="30" max="110" step="1" value="${viewerConfig.camera.fov}" data-camera-fov />
              <output data-camera-fov-value>${viewerConfig.camera.fov.toFixed(0)}&deg;</output>
            </label>
            <label class="field field-range">
              <span>Camera Height</span>
              <input type="range" name="camera-height" min="0.5" max="2.5" step="0.01" value="${viewerConfig.camera.height}" data-camera-height />
              <output data-camera-height-value>${viewerConfig.camera.height.toFixed(2)}</output>
            </label>
          </div>
          <div class="layer-controls">
            <label class="layer-toggle">
              <input type="checkbox" name="show-crosshair" data-show-crosshair ${viewerConfig.interface.showCrosshair ? "checked" : ""} />
              <span class="layer-toggle-copy">
                <strong>Show Crosshair</strong>
              </span>
            </label>
            <label class="layer-toggle">
              <input type="checkbox" name="camera-shake" data-camera-shake ${viewerConfig.camera.ambientMotion.enabled ? "checked" : ""} />
              <span class="layer-toggle-copy">
                <strong>Camera Shake</strong>
              </span>
            </label>
          </div>
        `,
      },
      {
        id: "background",
        label: "Background",
        modes: ["debug"],
        render: ({ viewerConfig }) => `
          <div class="color-tools">
            <label class="field field-range">
              <span>Hue</span>
              <input type="range" name="background-hue" min="-180" max="180" step="1" value="${viewerConfig.materialPresets.background.hueDegrees}" data-background-hue />
              <output data-background-hue-value>${viewerConfig.materialPresets.background.hueDegrees.toFixed(0)}&deg;</output>
            </label>
            <label class="field field-range">
              <span>Saturation</span>
              <input type="range" name="background-saturation" min="0" max="2" step="0.01" value="${viewerConfig.materialPresets.background.saturation}" data-background-saturation />
              <output data-background-saturation-value>${viewerConfig.materialPresets.background.saturation.toFixed(2)}</output>
            </label>
            <label class="field field-range">
              <span>Value</span>
              <input type="range" name="background-value" min="0" max="2" step="0.01" value="${viewerConfig.materialPresets.background.value}" data-background-value />
              <output data-background-value-output>${viewerConfig.materialPresets.background.value.toFixed(2)}</output>
            </label>
          </div>
        `,
      },
    ],
  },
  {
    id: "objects",
    label: "Objects",
    items: [
      {
        id: "object-inspector",
        label: "Inspector",
        modes: ["debug"],
        render: () => `
          <div class="layer-controls">
            <p class="debug-note" data-object-selection-hint>No object selected.</p>
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
                <input type="range" name="object-hue" min="-180" max="180" step="1" value="0" data-object-hue />
                <output data-object-hue-value>0&deg;</output>
              </label>
              <label class="field field-range">
                <span>Saturation</span>
                <input type="range" name="object-saturation" min="0" max="4" step="0.02" value="1" data-object-saturation />
                <output data-object-saturation-value>1.00</output>
              </label>
              <label class="field field-range">
                <span>Value</span>
                <input type="range" name="object-value" min="0" max="4" step="0.02" value="1" data-object-value />
                <output data-object-value-value>1.00</output>
              </label>
              <label class="field field-range">
                <span>Gamma</span>
                <input type="range" name="object-gamma" min="0.25" max="4" step="0.02" value="1" data-object-gamma />
                <output data-object-gamma-value>1.00</output>
              </label>
            </div>
            <div class="button-row">
              <button type="button" class="action-button" data-copy-object-overrides>Copy Overrides JSON</button>
              <button type="button" class="action-button is-secondary" data-save-object-overrides>Save Overrides JSON</button>
            </div>
            <p class="debug-note" data-object-overrides-status>Overrides ready.</p>
          </div>
        `,
      },
      {
        id: "layers",
        label: "Layers",
        modes: ["debug"],
        render: () => `
          <div class="layer-controls" data-layer-controls>
            <p class="empty-state">No layers yet.</p>
          </div>
        `,
      },
    ],
  },
  {
    id: "materials",
    label: "Materials",
    items: [
      {
        id: "fire",
        label: "Fire",
        modes: ["debug"],
        render: ({ viewerConfig }) => `
          <div class="color-tools">
            <label class="field field-range">
              <span>Hue</span>
              <input type="range" name="fire-hue" min="-180" max="180" step="1" value="${viewerConfig.materialPresets.fireVideo.hueDegrees}" data-fire-hue />
              <output data-fire-hue-value>${viewerConfig.materialPresets.fireVideo.hueDegrees.toFixed(0)}&deg;</output>
            </label>
            <label class="field field-range">
              <span>Saturation</span>
              <input type="range" name="fire-saturation" min="0" max="2" step="0.01" value="${viewerConfig.materialPresets.fireVideo.saturation}" data-fire-saturation />
              <output data-fire-saturation-value>${viewerConfig.materialPresets.fireVideo.saturation.toFixed(2)}</output>
            </label>
            <label class="field field-range">
              <span>Value</span>
              <input type="range" name="fire-value" min="0" max="2" step="0.01" value="${viewerConfig.materialPresets.fireVideo.value}" data-fire-value />
              <output data-fire-value-output>${viewerConfig.materialPresets.fireVideo.value.toFixed(2)}</output>
            </label>
          </div>
        `,
      },
      {
        id: "reflect",
        label: "Reflect",
        modes: ["debug"],
        render: ({ viewerConfig }) => `
          <div class="color-tools">
            <label class="field field-range">
              <span>Env Intensity</span>
              <input type="range" name="reflect-env-intensity" min="0" max="4" step="0.01" value="${viewerConfig.materialPresets.reflectMaterial.envMapIntensity}" data-reflect-env-intensity />
              <output data-reflect-env-intensity-value>${viewerConfig.materialPresets.reflectMaterial.envMapIntensity.toFixed(2)}</output>
            </label>
            <label class="field field-range">
              <span>IOR</span>
              <input type="range" name="reflect-ior" min="1" max="2.5" step="0.01" value="${viewerConfig.materialPresets.reflectMaterial.ior}" data-reflect-ior />
              <output data-reflect-ior-value>${viewerConfig.materialPresets.reflectMaterial.ior.toFixed(2)}</output>
            </label>
            <label class="field field-range">
              <span>Specular</span>
              <input type="range" name="reflect-specular" min="0" max="1" step="0.01" value="${viewerConfig.materialPresets.reflectMaterial.specularIntensity}" data-reflect-specular />
              <output data-reflect-specular-value>${viewerConfig.materialPresets.reflectMaterial.specularIntensity.toFixed(2)}</output>
            </label>
            <label class="field field-range">
              <span>Metalness</span>
              <input type="range" name="reflect-metalness" min="0" max="1" step="0.01" value="${viewerConfig.materialPresets.reflectMaterial.defaultMetalness}" data-reflect-metalness />
              <output data-reflect-metalness-value>${viewerConfig.materialPresets.reflectMaterial.defaultMetalness.toFixed(2)}</output>
            </label>
            <label class="field field-range">
              <span>Env Rotation Y</span>
              <input type="range" name="reflect-env-rotation-y" min="-180" max="180" step="1" value="${viewerConfig.materialPresets.reflectMaterial.envMapRotationDegrees}" data-reflect-env-rotation-y />
              <output data-reflect-env-rotation-y-value>${viewerConfig.materialPresets.reflectMaterial.envMapRotationDegrees.toFixed(0)}&deg;</output>
            </label>
          </div>
        `,
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        id: "overview",
        label: "Overview",
        modes: ["viewer", "debug"],
        render: () => `
          <div class="stats-grid stats-grid-wide">
            <div class="stat-card">
              <span>FPS</span>
              <strong data-stat-fps>0</strong>
            </div>
            <div class="stat-card">
              <span>Frame Time</span>
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
            <div class="stat-card">
              <span>Textures</span>
              <strong data-stat-textures>0</strong>
            </div>
            <div class="stat-card">
              <span>Texture VRAM</span>
              <strong data-stat-texture-memory>0 MB</strong>
            </div>
          </div>
        `,
      },
      {
        id: "session",
        label: "Session",
        modes: ["debug"],
        render: () => `
          <div class="layer-controls">
            <div class="button-row">
              <button type="button" class="action-button" data-reload-assets>Reload Assets</button>
              <button type="button" class="action-button is-secondary" data-exit-debug>Exit Debug</button>
            </div>
          </div>
        `,
      },
      {
        id: "performance",
        label: "Performance",
        modes: ["debug"],
        render: () => `
          <div class="layer-controls">
            <label class="layer-toggle">
              <input type="checkbox" name="base-low-memory" data-base-low-memory />
              <span class="layer-toggle-copy">
                <strong>Low-memory base textures</strong>
              </span>
            </label>
            <label class="field">
              <span>Base Texture Cap</span>
              <select name="base-texture-cap" data-base-texture-cap>
                <option value="0">Off</option>
                <option value="4096">4096</option>
                <option value="3072">3072</option>
                <option value="2048">2048</option>
                <option value="1024">1024</option>
              </select>
            </label>
          </div>
        `,
      },
      {
        id: "viewport-advanced",
        label: "Viewport Adv",
        modes: ["debug"],
        render: () => `
          <div class="color-tools">
            <label class="field">
              <span>View Transform</span>
              <select name="tone-mapping" data-tone-mapping>
                <option value="standard">Standard</option>
                <option value="none">None</option>
              </select>
            </label>
          </div>
        `,
      },
    ],
  },
];

export function getDockCategories(mode) {
  const orderedIds = mode === "debug"
    ? ["system", "viewport", "objects", "materials"]
    : ["system", "viewport"];

  return orderedIds
    .map((id) => DOCK_CATEGORIES.find((category) => category.id === id))
    .filter(Boolean);
}

export function isDockCategoryVisible(categoryId, mode) {
  return getDockCategories(mode).some((category) => category.id === categoryId);
}

export function getItemsForCategory(categoryId, mode) {
  const category = DOCK_CATEGORIES.find((cat) => cat.id === categoryId);
  if (!category) return [];
  return category.items.filter((item) => item.modes.includes(mode));
}

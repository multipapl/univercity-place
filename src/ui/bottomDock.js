import { getDockCategories } from "./dockConfig.js";

function buildCategoryButton(category) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dock-category-btn";
  button.dataset.dockCategory = category.id;
  button.tabIndex = -1;
  button.textContent = category.label;

  if (category.id === "system") {
    button.title = "Middle-click to toggle debug tools";
  }

  return button;
}

export function renderBottomDockCategories(categoriesContainer, mode) {
  if (!categoriesContainer) {
    return;
  }

  categoriesContainer.replaceChildren(
    ...getDockCategories(mode).map((category) => buildCategoryButton(category)),
  );
}

export function createBottomDock({ menuMode, viewerConfig }) {
  const dock = document.createElement("div");
  dock.className = "bottom-dock";
  dock.dataset.bottomDock = "";
  dock.hidden = true;
  dock.innerHTML = `
    <div class="bottom-dock-shell">
      <div class="bottom-dock-meta">
        <button type="button" class="bottom-help-button" data-bottom-help-toggle aria-expanded="false" tabindex="-1">
          Help
        </button>
        <span class="debug-indicator" data-debug-indicator hidden>Debug Mode</span>
      </div>
      <div class="bottom-dock-categories" data-bottom-dock-categories></div>
      <div class="bottom-dock-readouts">
        <div class="dock-readout dock-readout--compact">
          <span>FPS</span>
          <strong data-bottom-quick-fps-value>0</strong>
        </div>
        <div class="dock-readout dock-readout--compact">
          <span>FOV</span>
          <strong data-bottom-quick-camera-fov-value>${viewerConfig.camera.fov.toFixed(0)}&deg;</strong>
        </div>
        <div class="dock-readout dock-readout--compact">
          <span>Height</span>
          <strong data-bottom-quick-camera-height-value>${viewerConfig.camera.height.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  `;

  const categoriesContainer = dock.querySelector("[data-bottom-dock-categories]");
  renderBottomDockCategories(categoriesContainer, menuMode);

  return {
    dock,
    categoriesContainer,
    debugIndicator: dock.querySelector("[data-debug-indicator]"),
  };
}

export function updateBottomDockActiveCategory(dockElement, activeCategoryId) {
  const buttons = dockElement?.querySelectorAll("[data-dock-category]") ?? [];
  buttons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.dockCategory === activeCategoryId);
  });
}

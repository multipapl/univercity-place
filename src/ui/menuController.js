import {
  isDockCategoryVisible,
} from "./dockConfig.js";
import {
  renderBottomDockCategories,
  updateBottomDockActiveCategory,
} from "./bottomDock.js";
import {
  setSidebarOpen,
  showSidebarCategory,
} from "./leftSidebar.js";

function getFallbackCategoryForMode() {
  return "viewport";
}

export function createMenuController({
  viewport,
  hud,
  menuToggleButton,
  bottomDock,
  bottomDockCategories,
  leftSidebar,
  sidebarTitle,
  initialMode = "viewer",
  isTouchDevice,
  navigationController,
  updateStatus,
  onDebugToggleRequest,
}) {
  const state = {
    isOpen: false,
    mode: initialMode,
    activeCategoryId: null,
    relockAfterClose: false,
  };

  function syncDockButtons() {
    renderBottomDockCategories(bottomDockCategories, state.mode);
  }

  function syncSidebarContent() {
    if (!state.activeCategoryId) {
      return;
    }

    showSidebarCategory({
      sidebarElement: leftSidebar,
      titleElement: sidebarTitle,
      categoryId: state.activeCategoryId,
      mode: state.mode,
    });
  }

  function syncVisualState() {
    const highlightCategoryId = state.isOpen && leftSidebar?.classList.contains("is-open")
      ? state.activeCategoryId
      : null;
    updateBottomDockActiveCategory(bottomDock, highlightCategoryId);
  }

  function setCategory(nextCategoryId) {
    if (!nextCategoryId || !isDockCategoryVisible(nextCategoryId, state.mode)) {
      return;
    }

    const sidebarIsOpen = leftSidebar?.classList.contains("is-open");
    if (state.activeCategoryId === nextCategoryId && sidebarIsOpen) {
      setSidebarOpen(leftSidebar, false);
      syncVisualState();
      return;
    }

    state.activeCategoryId = nextCategoryId;
    syncSidebarContent();
    setSidebarOpen(leftSidebar, true);
    syncVisualState();
  }

  function setOpen(nextOpen) {
    if (state.isOpen === nextOpen) {
      return;
    }

    state.isOpen = nextOpen;
    menuToggleButton?.setAttribute("aria-expanded", `${nextOpen}`);
    hud.classList.toggle("is-open", nextOpen);
    viewport.classList.toggle("has-menu-open", nextOpen);

    if (bottomDock) {
      bottomDock.hidden = !nextOpen;
      bottomDock.classList.toggle("is-open", nextOpen);
    }

    if (nextOpen) {
      syncDockButtons();
      setSidebarOpen(leftSidebar, false);
      syncVisualState();
      state.relockAfterClose = navigationController.controls.isLocked && !isTouchDevice;
      navigationController.controls.unlock();
      navigationController.resetMovementInputs();
      updateStatus("Menu open. Scene controls are paused.");
      return;
    }

    setSidebarOpen(leftSidebar, false);
    syncVisualState();

    if (state.relockAfterClose && !isTouchDevice) {
      requestAnimationFrame(() => {
        navigationController.controls.lock({ ignoreCooldown: true });
      });
    }
  }

  function setMode(nextMode) {
    state.mode = nextMode === "debug" ? "debug" : "viewer";

    if (!isDockCategoryVisible(state.activeCategoryId, state.mode)) {
      state.activeCategoryId = leftSidebar?.classList.contains("is-open")
        ? getFallbackCategoryForMode(state.mode)
        : null;
    }

    syncDockButtons();

    if (leftSidebar?.classList.contains("is-open") && state.activeCategoryId) {
      syncSidebarContent();
    } else {
      setSidebarOpen(leftSidebar, false);
    }

    syncVisualState();
  }

  function handleDockClick(event) {
    const button = event.target.closest("[data-dock-category]");
    if (!button || !bottomDock?.contains(button)) {
      return;
    }

    button.blur?.();
    setCategory(button.dataset.dockCategory || "");
  }

  function handleDockAuxClick(event) {
    const button = event.target.closest("[data-dock-category]");
    if (!button || !bottomDock?.contains(button)) {
      return;
    }

    if (event.button !== 1 || button.dataset.dockCategory !== "system") {
      return;
    }

    event.preventDefault();
    button.blur?.();
    onDebugToggleRequest?.();
  }

  bottomDock?.addEventListener("click", handleDockClick);
  bottomDock?.addEventListener("auxclick", handleDockAuxClick);
  syncDockButtons();
  syncVisualState();

  return {
    dispose() {
      bottomDock?.removeEventListener("click", handleDockClick);
      bottomDock?.removeEventListener("auxclick", handleDockAuxClick);
    },
    isOpen: () => state.isOpen,
    setOpen,
    setMode,
  };
}

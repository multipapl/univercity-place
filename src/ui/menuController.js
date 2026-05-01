export function createMenuController({
  viewport,
  hud,
  hudPanel,
  menuToggleButton,
  initialMode = "viewer",
  isTouchDevice,
  navigationController,
  updateStatus,
}) {
  const state = {
    isOpen: false,
    mode: initialMode,
    openSectionId: null,
    relockAfterClose: false,
  };
  const cleanupCallbacks = [];

  function getSectionEntries() {
    if (!hudPanel) {
      return [];
    }

    return [...hudPanel.querySelectorAll("[data-menu-section]")].map((section) => ({
      section,
      id: section.dataset.menuSection || "",
      modes: (section.dataset.menuSectionModes || "")
        .split(/\s+/)
        .filter(Boolean),
      toggle: section.querySelector("[data-menu-section-toggle]"),
      panel: section.querySelector("[data-menu-section-panel]"),
    }));
  }

  function getVisibleSectionEntries() {
    return getSectionEntries().filter((entry) => entry.modes.includes(state.mode));
  }

  function applySectionOpenState(entry, isOpen) {
    if (!entry.toggle || !entry.panel) {
      return;
    }

    entry.section.classList.toggle("is-open", isOpen);
    entry.toggle.setAttribute("aria-expanded", `${isOpen}`);
    entry.panel.hidden = !isOpen;
  }

  function setOpenSection(nextSectionId) {
    const visibleEntries = getVisibleSectionEntries();
    const resolvedSectionId = visibleEntries.some((entry) => entry.id === nextSectionId)
      ? nextSectionId
      : (visibleEntries[0]?.id ?? null);

    state.openSectionId = resolvedSectionId;
    getSectionEntries().forEach((entry) => {
      applySectionOpenState(entry, entry.id === resolvedSectionId && !entry.section.hidden);
    });
  }

  function applyMode() {
    const sectionEntries = getSectionEntries();
    sectionEntries.forEach((entry) => {
      entry.section.hidden = !entry.modes.includes(state.mode);
    });

    setOpenSection(state.openSectionId);
  }

  function setOpen(nextOpen) {
    if (state.isOpen === nextOpen) {
      return;
    }

    state.isOpen = nextOpen;
    menuToggleButton?.setAttribute("aria-expanded", `${nextOpen}`);
    hud.classList.toggle("is-open", nextOpen);
    viewport.classList.toggle("has-menu-open", nextOpen);

    if (hudPanel) {
      hudPanel.hidden = !nextOpen;
    }

    if (nextOpen) {
      state.relockAfterClose = navigationController.controls.isLocked && !isTouchDevice;
      navigationController.controls.unlock();
      navigationController.resetMovementInputs();
      updateStatus("Menu open. Scene controls are paused.");
      return;
    }

    if (state.relockAfterClose && !isTouchDevice) {
      requestAnimationFrame(() => {
        navigationController.controls.lock({ ignoreCooldown: true });
      });
    }
  }

  function setMode(nextMode) {
    const normalizedMode = nextMode === "debug" ? "debug" : "viewer";
    if (state.mode === normalizedMode) {
      return;
    }

    state.mode = normalizedMode;
    applyMode();
  }

  getSectionEntries().forEach((entry) => {
    if (!entry.toggle || !entry.id) {
      return;
    }

    const handleToggleClick = () => {
      setOpenSection(entry.id);
    };

    entry.toggle.addEventListener("click", handleToggleClick);
    cleanupCallbacks.push(() => {
      entry.toggle?.removeEventListener("click", handleToggleClick);
    });
  });

  applyMode();

  return {
    dispose() {
      cleanupCallbacks.forEach((cleanup) => {
        cleanup();
      });
      cleanupCallbacks.length = 0;
    },
    isOpen: () => state.isOpen,
    setOpen,
    setMode,
  };
}

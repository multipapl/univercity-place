export function createMenuController({
  viewport,
  hud,
  hudPanel,
  menuToggleButton,
  isTouchDevice,
  navigationController,
  updateStatus,
}) {
  const state = {
    isOpen: false,
    relockAfterClose: false,
  };

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

  return {
    isOpen: () => state.isOpen,
    setOpen,
  };
}

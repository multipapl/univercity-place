import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

export function createVrSession({
  renderer,
  viewport,
  sessionInit = {},
  xrFramebufferScaleFactor = null,
  xrFoveation = null,
  onBeforeSessionStart,
  onSessionStart,
  onSessionEnd,
}) {
  let vrButtonElement = null;

  function handleSessionStart() {
    if (Number.isFinite(xrFoveation) && typeof renderer.xr.setFoveation === "function") {
      renderer.xr.setFoveation(xrFoveation);
    }
    onSessionStart?.();
  }

  function handleSessionEnd() {
    onSessionEnd?.();
  }

  function setupXr() {
    renderer.xr.enabled = true;
    if (
      Number.isFinite(xrFramebufferScaleFactor)
      && typeof renderer.xr.setFramebufferScaleFactor === "function"
    ) {
      renderer.xr.setFramebufferScaleFactor(xrFramebufferScaleFactor);
    }
    renderer.xr.setReferenceSpaceType("local-floor");
    renderer.xr.addEventListener("sessionstart", handleSessionStart);
    renderer.xr.addEventListener("sessionend", handleSessionEnd);
  }

  function appendVrButton() {
    if (vrButtonElement) {
      return;
    }

    const button = VRButton.createButton(renderer, sessionInit);
    button.addEventListener("click", () => {
      if (!renderer.xr.isPresenting) {
        onBeforeSessionStart?.();
      }
    }, { capture: true });
    button.style.cssText = [
      "position: absolute",
      "bottom: 80px",
      "left: 50%",
      "transform: translateX(-50%)",
      "padding: 12px 24px",
      "border: 1px solid rgba(255,255,255,0.3)",
      "border-radius: 8px",
      "background: rgba(15,23,42,0.85)",
      "color: #e2e8f0",
      "font-family: system-ui, sans-serif",
      "font-size: 14px",
      "cursor: pointer",
      "z-index: 999",
    ].join(";");
    viewport.appendChild(button);
    vrButtonElement = button;
  }

  async function init() {
    if (!navigator.xr) {
      return;
    }

    const isSupported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!isSupported) {
      return;
    }

    setupXr();
    appendVrButton();
  }

  function dispose() {
    renderer.xr.removeEventListener("sessionstart", handleSessionStart);
    renderer.xr.removeEventListener("sessionend", handleSessionEnd);

    if (vrButtonElement?.parentNode) {
      vrButtonElement.parentNode.removeChild(vrButtonElement);
    }

    vrButtonElement = null;
    renderer.xr.enabled = false;
  }

  function isPresenting() {
    return renderer.xr.isPresenting;
  }

  return {
    init,
    dispose,
    isPresenting,
  };
}

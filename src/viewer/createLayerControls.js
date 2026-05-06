function createLayerToggleEntry({
  entry,
  debugMode,
  requestRender,
  updatePerformanceDiagnostics,
  updateStatus,
}) {
  const label = document.createElement("label");
  label.className = "layer-toggle";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.name = "layer-visibility";
  checkbox.checked = entry.root.visible;
  checkbox.addEventListener("change", () => {
    entry.root.visible = checkbox.checked;
    requestRender?.();
    updatePerformanceDiagnostics();
    updateStatus(`${entry.layer.label} layer ${checkbox.checked ? "enabled" : "disabled"}.`);
  });

  const textWrap = document.createElement("span");
  textWrap.className = "layer-toggle-copy";

  const title = document.createElement("strong");
  title.textContent = entry.layer.label;

  const details = document.createElement("small");
  details.textContent = debugMode
    ? `${entry.layer.id} · ${entry.layer.url}`
    : entry.layer.id;

  textWrap.append(title, details);
  label.append(checkbox, textWrap);
  return label;
}

export function createLayerControls({
  container,
  diagnosticsState,
  getDebugMode,
  requestRender,
  updatePerformanceDiagnostics,
  updateStatus,
}) {
  function render() {
    if (!container) {
      return;
    }

    const debugMode = getDebugMode();
    if (!debugMode) {
      container.replaceChildren();
      return;
    }

    if (!diagnosticsState.loadedLayers.length) {
      const emptyState = document.createElement("p");
      emptyState.className = "empty-state";
      emptyState.textContent = "Layers will appear here after scene load.";
      container.replaceChildren(emptyState);
      return;
    }

    container.replaceChildren(
      ...diagnosticsState.loadedLayers.map((entry) => (
        createLayerToggleEntry({
          entry,
          debugMode,
          requestRender,
          updatePerformanceDiagnostics,
          updateStatus,
        })
      )),
    );
  }

  return { render };
}

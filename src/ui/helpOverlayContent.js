function renderHelpGroup(title, items) {
  return `
    <section class="help-group">
      <h2>${title}</h2>
      <div class="help-list">
        ${items.map((item) => `
          <div class="help-item">
            <div class="help-item-keys">${item.keys}</div>
            <p>${item.description}</p>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

export function buildHelpOverlayMarkup({
  isTouchDevice,
  isWalkMode,
}) {
  const movementItems = isTouchDevice
    ? [
        { keys: "<kbd>Left Pad</kbd>", description: "Move through the scene." },
        { keys: "<kbd>Right Pad</kbd>", description: "Look around." },
        { keys: "<kbd>Boost</kbd>", description: isWalkMode ? "Sprint faster." : "Boost movement speed." },
      ]
    : [
        { keys: "<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>", description: "Move through the scene." },
        { keys: isWalkMode ? "<kbd>Shift</kbd>" : "<kbd>Shift</kbd><kbd>Space</kbd><kbd>C</kbd>", description: isWalkMode ? "Sprint while moving." : "Boost, move up, or move down." },
        { keys: "<kbd>Mouse</kbd>", description: "Look around while pointer lock is active." },
      ];

  const cameraItems = [
    { keys: "<kbd>Q</kbd><kbd>E</kbd>", description: "Lower or raise the camera height." },
    { keys: "<kbd>Shift</kbd> + <kbd>Wheel</kbd>", description: "Widen or narrow the field of view." },
    { keys: "<kbd>Wheel</kbd>", description: "Adjust move speed when overlays are closed." },
  ];

  const interfaceItems = [
    { keys: "<kbd>M</kbd>", description: "Open or close the control drawer." },
    { keys: "<kbd>H</kbd>", description: "Open or close the help overlay." },
    { keys: "<kbd>Esc</kbd>", description: "Close the current overlay or release the cursor." },
  ];

  const tuningItems = [
    { keys: "<kbd>Stats</kbd>", description: "Use the live numbers up top to keep the scene responsive." },
    { keys: "<kbd>Viewport</kbd>", description: "Use the drawer for exposure, bloom, and base camera tuning." },
    { keys: "<kbd>Debug Mode</kbd>", description: "Advanced material, layer, and inspector tools appear only when debug is active." },
  ];

  return `
    <div class="help-card">
      <div class="help-header">
        <div>
          <p class="help-kicker">Viewer Guide</p>
          <h1>Everything important should explain itself</h1>
          <p>Use the dock for the essentials, the drawer for deeper tuning, and these shortcuts when you want a faster, more game-like flow.</p>
        </div>
        <button type="button" class="menu-close" data-help-close aria-label="Close help">Close</button>
      </div>
      <div class="help-grid">
        ${renderHelpGroup("Movement", movementItems)}
        ${renderHelpGroup("Camera", cameraItems)}
        ${renderHelpGroup("Interface", interfaceItems)}
        ${renderHelpGroup("Tuning", tuningItems)}
      </div>
      <div class="help-footer">
        <p>Tip: the control drawer only shows the tools that make sense for the current mode.</p>
      </div>
    </div>
  `;
}

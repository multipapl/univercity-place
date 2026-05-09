# University Place: Emberglass

Scene-specific architectural viewer built with `three` + `vite`.

This runtime is intentionally narrow: fixed scene contract, specialized material paths, web-first delivery, and a lightweight internal debug workflow.

## Quick Start

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm test
npm run build
npm run preview
```

## Asset Delivery

Default local asset tree:

```text
/assets
```

Local folders:

```text
public/assets/audio/
public/assets/renders/
public/assets/scene/
```

Preferred remote root override:

```text
VITE_ASSET_BASE_URL=https://assets.example.com/assets
```

Backward-compatible scene-only override:

```text
VITE_SCENE_ASSET_BASE_URL=https://assets.example.com/assets/scene
```

Optional per-category overrides:

```text
VITE_RENDER_ASSET_BASE_URL=https://assets.example.com/assets/renders
VITE_AUDIO_ASSET_BASE_URL=https://assets.example.com/assets/audio
```

The app bundle ships with the site, while heavy scene assets, render media, and ambient audio can be served from object storage using the same `/assets/{scene,renders,audio}` structure.

## Current Asset Contract

Single source of truth:

```text
src/config/assetsConfig.js
```

Required:

```text
scene.glb
```

Optional scene layers:

```text
bg.glb
sky.glb
collision.glb
translucent.glb
glass.glb
reflect.glb
windows.glb
fire.glb
emissive.glb
```

Related runtime assets:

```text
probes.glb
fire.mp4
atlasaudio-ambient-soft-511880.mp3
```

If the required base scene is missing, the app falls back to a placeholder room instead of crashing.

## Runtime Shape

- `src/main.js` bootstraps the app.
- `src/viewer/createViewerApp.js` composes the runtime and owns `init()` / `dispose()`.
- `src/viewer/createViewerLifecycle.js` owns active / paused / background render behavior.
- `src/loaders/sceneLayerLoader.js` loads required and optional layers, applies runtime assets, and handles fallback transitions.
- `src/materials/` contains the specialized material pipeline.
- `src/camera/navigationController.js` owns desktop/mobile movement and collision-aware walk behavior.
- `tests/` contains focused Node tests for state, lifecycle, materials, loaders, diagnostics, and disposal.

## Query Overrides

Layer URLs can be overridden from the URL, for example:

```text
/?scene=https://example.com/scene.glb
```

Supported asset params:

- `scene`
- `background`
- `sky`
- `collision`
- `alpha`
- `glass`
- `reflect`
- `windows`
- `fire`
- `emissive`
- `probes`
- `fireVideo`
- `ambientAudio`

Useful runtime flags:

- `debug=1`
- `assetBust=...`
- `lowMemoryBase=1`
- `baseTextureCap=2048`
- `bloom=0`

## Interaction

- Desktop: click to lock pointer, `WASD` move, `Shift` boost, wheel speed, `Shift` + wheel FOV, `Q` / `E` camera height.
- Mobile: left joystick moves, right pad looks, boost button accelerates.
- `M` toggles the drawer.
- `H` toggles help.
- `Esc` closes overlays or releases pointer lock.

Default locomotion mode is `walk`. If `collision.glb` is present, walk mode uses collision-aware movement.

## Debug Workflow

Enable debug mode with `?debug=1`.

Debug mode adds:

- layer toggles
- object picking
- per-target HSV / gamma overrides
- performance diagnostics
- asset reload helpers

Local internal files:

```text
public/debug.scene-overrides.json
public/material-settings.json
```

During `npm run dev`, `vite.config.js` exposes local save-back routes for both override flows.

## Internal Notes

Local docs in `docs/` are ignored by git and intentionally kept small. The main ones are:

1. `docs/PROJECT_NOTES.md`
2. `docs/performance-review-2026-05-09.md`
3. `docs/vr-mode-run-guide.md`

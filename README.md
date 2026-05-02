# University Place: Emberglass

Scene-specific architectural viewer built with `three` + `vite`.

This project is intentionally narrow. It assumes a known asset contract, a layered scene export, and a few specialized runtime material paths.

## What Matters

- This is a delivery viewer, not a generic editor or engine.
- The required base layer is `scene.glb`; everything else is optional.
- Runtime behavior depends on stable layer, mesh, and material naming.
- Internal docs in `docs/` are local-only and ignored by git.

## Quick Start

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm run build
npm run preview
```

## Asset Contract

Default asset root:

```text
public/assets/scene/
```

Required:

```text
scene.glb
```

Optional:

```text
bg.glb
BG360.glb
leaf.glb
glass.glb
reflect.glb
fx.glb
fire.mp4
cubemap.png
```

Layer mapping:

- `scene.glb` -> baked base scene
- `bg.glb` -> animated background path
- `BG360.glb` -> unlit alpha panorama path
- `leaf.glb` -> alpha-cutout foliage path
- `glass.glb` -> glass material path
- `reflect.glb` -> reflective hero-material path
- `fx.glb` -> FX meshes, including fire-video targets
- `fire.mp4` -> runtime fire source
- `cubemap.png` -> reflection environment source

If the required base scene is missing, the app loads a placeholder room instead of crashing.

## Runtime Shape

- `src/main.js` only bootstraps the app and renders a startup error shell if init fails.
- `src/viewer/createViewerApp.js` composes the runtime.
- `src/viewer/createViewerState.js` owns mutable runtime state.
- `src/viewer/createViewerLifecycle.js` owns the render loop, resize handling, and teardown.
- `src/loaders/sceneLayerLoader.js` loads required and optional layers, applies runtime assets, and handles fallback transitions.
- `src/materials/` contains the specialized material pipeline.
- `src/ui/` contains the shell, menu structure, help overlay, and debug/viewer bindings.

## Query Overrides

Each layer can be overridden from the URL, for example:

```text
/?scene=https://example.com/scene.glb
```

Supported asset params:

- `scene`
- `background`
- `bg360`
- `alpha`
- `glass`
- `reflect`
- `fx`
- `fireVideo`
- `reflectEnv`

Useful runtime flags:

- `debug=1`
- `assetBust=...`
- `lowMemoryBase=1`
- `baseTextureCap=2048`

## Interaction

- Desktop: click to lock pointer, `WASD` to move, `Shift` to sprint/boost, wheel for speed, `Shift` + wheel for FOV, `Q` / `E` for camera height.
- Mobile: left joystick moves, right pad looks, boost button accelerates, fly up/down buttons appear in fly mode.
- `M` toggles the control drawer.
- `H` toggles help.
- `Esc` closes overlays or releases pointer lock.

Default locomotion mode is `walk`. There is no collision system.

## Debug Notes

Enable debug mode with `?debug=1`.

Debug mode adds:

- live layer toggles
- object picking
- per-target HSV and gamma overrides
- texture and performance diagnostics
- local override copy/save flow
- explicit asset reload

Local override file:

```text
public/debug.scene-overrides.json
```

During `npm run dev`, `vite.config.js` exposes a dev-only POST endpoint at `/__debug/scene-overrides`.

## Reading Order

1. `README.md`
2. `docs/CURRENT_SYSTEM_OVERVIEW.md`
3. `docs/PROJECT_NOTES.md`

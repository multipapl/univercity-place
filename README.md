# University Place: Emberglass

Scene-specific architectural viewer built with `three` + `vite`.

This runtime is intentionally narrow. It assumes a fixed layered asset contract, stable naming, and a few specialized material paths. It is a delivery viewer, not a generic editor or engine.

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

## Scene Asset Delivery

Default asset base URL:

```text
/assets/scene
```

By default that resolves to local files in:

```text
public/assets/scene/
```

You can point the runtime at object storage instead:

```text
VITE_SCENE_ASSET_BASE_URL=https://assets.example.com/assets/scene
```

Current intended deployment shape:

- app bundle and `/public/draco` ship with the site
- heavy scene payload can live in Cloudflare R2 or another public object store
- if `VITE_SCENE_ASSET_BASE_URL` is unset, the viewer falls back to local `/public/assets/scene`

## Asset Contract

All runtime asset paths live in one manifest:

```text
src/config/assetsConfig.js
```

Each asset entry can define both `localPath` and `remotePath`. The runtime resolves URLs from that manifest instead of hardcoding filenames in loaders.

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

- `src/main.js` bootstraps the app and renders a startup error shell if init fails.
- `src/viewer/createViewerApp.js` composes the runtime and owns `init()` / `dispose()`.
- `src/viewer/createViewerState.js` owns mutable runtime state.
- `src/config/assetsConfig.js` is the single source of truth for local/remote asset paths and per-layer runtime flags.
- `src/viewer/createViewerLifecycle.js` owns the render loop, resize handling, and teardown.
- `src/loaders/sceneLayerLoader.js` loads required and optional layers, applies runtime assets, and handles fallback transitions.
- `src/materials/` contains the specialized material pipeline.
- `src/ui/` contains the shell, menu structure, help overlay, and viewer/debug bindings.
- `tests/` contains focused Node tests for state creation, override logic, diagnostics, debug targeting, and disposal helpers.

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

`assetBust` flows through the asset resolver for top-level scene layers, fire video, and reflection environment URLs. During local dev, the app also timestamps same-origin asset requests automatically to reduce stale caching.

## Interaction

- Desktop: click to lock pointer, `WASD` to move, `Shift` to sprint/boost, wheel for speed, `Shift` + wheel for FOV, `Q` / `E` for camera height.
- Mobile: left joystick moves, right pad looks, boost button accelerates, fly up/down buttons appear in fly mode.
- `M` toggles the control drawer.
- `H` toggles help.
- `Esc` closes overlays or releases pointer lock.

Default locomotion mode is `walk`. There is no collision system.

## Debug Workflow

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
4. `docs/r2-asset-migration.md`

The files in `docs/` are internal workspace notes in this repo and are currently ignored by git.

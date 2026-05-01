# University Place: Emberglass

Browser viewer for a layered baked architectural scene built on `three` + `vite`.

This project is intentionally scene-specific. It is not trying to be a generic 3D engine or editor. The runtime assumes a fixed asset contract, a known layer structure, and a small set of specialized material paths.

## Quick Start

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Preview the production bundle locally:

```bash
npm run preview
```

## Runtime Asset Contract

Default asset directory:

```text
public/assets/scene/
```

Required:

```text
scene.glb
```

Optional scene layers:

```text
bg.glb
BG360.glb
leaf.glb
glass.glb
reflect.glb
fx.glb
```

Optional runtime assets:

```text
fire.mp4
cubemap.png
```

Current layer mapping:

- `scene.glb`: required baked base scene
- `bg.glb`: shader-driven background layer
- `BG360.glb`: unlit alpha panorama layer
- `leaf.glb`: alpha cutout foliage layer
- `glass.glb`: glass material path
- `reflect.glb`: reflective material path
- `fx.glb`: FX meshes, including fire-video targets
- `fire.mp4`: runtime fire source
- `cubemap.png`: reflection environment source

If the required base layer is missing, the viewer falls back to a placeholder room.

## URL Overrides

Any layer can be overridden directly from the query string:

```text
http://localhost:5173/?scene=https://example.com/scene.glb
```

Supported asset override params:

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

## Controls

- Click the viewport to capture the mouse.
- `W`, `A`, `S`, `D` move.
- `Shift` sprints in walk mode or boosts in fly mode.
- `Space` moves up in fly mode.
- `C` moves down in fly mode.
- Mouse wheel changes movement speed.
- `Shift` + mouse wheel adjusts camera FOV.
- `Q` / `E` lower or raise camera height.
- `Esc` releases pointer lock.
- `M` opens the bottom control drawer.
- `H` opens the help overlay.

The current locomotion default is `walk`.

## Main Features

- layered GLTF scene loading
- specialized material pipeline for baked, alpha, glass, reflection, FX, and background layers
- selective bloom for FX content
- runtime fire-video patching
- mobile joystick + look-pad controls
- debug object inspector with per-material HSV and gamma overrides
- low-memory texture mode and runtime base texture cap
- loading progress bar driven by `THREE.LoadingManager`
- teardown-safe lifecycle for HMR / reloads / scene reloads

## Configuration

Config is split by domain under `src/config/`:

- `assetsConfig.js`
- `cameraConfig.js`
- `diagnosticsConfig.js`
- `interfaceConfig.js`
- `materialsConfig.js`
- `renderingConfig.js`
- `viewerConfig.js`

Runtime code should treat `VIEWER_CONFIG` as static defaults. Mutable live state now sits in dedicated runtime state objects inside `src/main.js`.

## Debug Workflow

Enable debug mode with `?debug=1`.

Debug mode adds:

- advanced viewport controls
- layer visibility toggles
- object inspector overrides
- performance and texture diagnostics
- texture/runtime tuning controls
- object picking and per-material overrides
- copy/save flow for debug override JSON
- explicit asset reload

Local override file:

```text
public/debug.scene-overrides.json
```

During `npm run dev`, `vite.config.js` exposes a dev-only POST endpoint at `/__debug/scene-overrides` so the in-viewer save action can write back to that file.

## Deployment Notes

- Static app output goes to `dist/`
- `vercel.json` is included for the current deployment flow
- scene assets use revalidating cache headers instead of `immutable`
- `public/robots.txt` currently blocks crawling because this viewer is treated as private/unlisted

## Documentation Map

Internal docs in `docs/` are intentionally local-only and ignored by git.

Recommended reading order for a fresh chat:

1. `docs/CURRENT_SYSTEM_OVERVIEW.md`
2. `README.md`
3. `docs/PROJECT_NOTES.md`

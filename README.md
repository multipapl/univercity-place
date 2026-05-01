# Three.js Baked Scene Viewer

Lightweight browser viewer for baked Blender scenes exported as `glTF`, with optional layered passes for background, BG360, foliage, glass, reflections, and FX.

## Quick Start

```bash
npm install
npm run dev
```

Open the local Vite URL in your browser.

For a production build:

```bash
npm run build
```

The generated site is written to `dist/`.

## Asset Contract

The viewer now uses a strict asset naming contract instead of probing multiple fallback filenames.

Required base scene:

```text
public/assets/scene/scene.glb
```

Optional layered assets:

```text
public/assets/scene/bg.glb
public/assets/scene/BG360.glb
public/assets/scene/leaf.glb
public/assets/scene/glass.glb
public/assets/scene/reflect.glb
public/assets/scene/fx.glb
public/assets/scene/fire.mp4
public/assets/scene/cubemap.png
```

Layer mapping:

- `scene.glb`: required baked base scene
- `bg.glb`: animated shader-driven background layer
- `BG360.glb`: unlit alpha panorama-style layer
- `leaf.glb`: alpha cutout foliage layer
- `glass.glb`: glass material path
- `reflect.glb`: reflective `MeshPhysicalMaterial` layer
- `fx.glb`: FX meshes, including fire-video targets
- `fire.mp4`: runtime fire video source
- `cubemap.png`: reflection environment source

If the required base layer is missing or fails to load, the viewer falls back to the placeholder room state.

## Query Params

Any asset can be overridden explicitly from the URL:

```text
http://localhost:5173/?scene=https://your-storage.example.com/scene.glb
```

Supported runtime overrides:

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

- `debug=1`: enables debug mode for the current URL
- `assetBust=...`: forces a fresh asset fetch token
- `lowMemoryBase=1`: disables base-layer mipmaps
- `baseTextureCap=2048`: caps baked base texture size at runtime

## Controls

- Click the viewport to capture the mouse.
- `W`, `A`, `S`, `D` move.
- `Shift` sprints in walk mode or boosts in fly mode.
- `Space` moves up in fly mode.
- `C` moves down in fly mode.
- Mouse wheel changes fly speed.
- `Esc` releases pointer lock.
- `M` opens the viewer menu.

The current default locomotion mode is `walk`, configured in [src/config/cameraConfig.js](./src/config/cameraConfig.js).

## Viewer Features

Current viewer capabilities:

- baked base scene rendering
- optional layered scene loading with a fixed naming contract
- alpha cutout foliage path
- shader-patched glass path
- selective reflection path with `MeshPhysicalMaterial`
- animated fire video override for FX targets
- animated background shader treatment
- selective bloom for FX content
- runtime viewport controls for tone mapping, exposure, bloom strength, `FOV`, camera height, and reflection tuning
- lightweight performance diagnostics
- low-memory baked texture mode and runtime base texture cap
- debug object inspector with per-material HSV and gamma overrides

## Debug Workflow

Debug mode is URL-driven and session-local. Enable it with `?debug=1`, or toggle it from the menu button using right click or middle click.

Debug mode adds:

- advanced viewport and material tuning controls
- layer visibility toggles
- performance tuning controls
- object inspector with pick-to-target workflow
- copy/save flow for object override JSON
- explicit asset reload action

Local object overrides are stored in:

```text
public/debug.scene-overrides.json
```

During `npm run dev`, the local Vite server exposes a dev-only save endpoint at `/__debug/scene-overrides`, so the in-viewer Save action writes back to `public/debug.scene-overrides.json`. Outside the local dev server, save-to-file is disabled and copy-to-clipboard remains the portable export path.

## Configuration

Viewer config is now split by domain under [`src/config/`](./src/config/):

- [src/config/assetsConfig.js](./src/config/assetsConfig.js): asset base URL, layer contracts, fire video asset, reflection environment asset
- [src/config/cameraConfig.js](./src/config/cameraConfig.js): camera and locomotion defaults
- [src/config/interfaceConfig.js](./src/config/interfaceConfig.js): UI-facing toggles such as crosshair visibility
- [src/config/diagnosticsConfig.js](./src/config/diagnosticsConfig.js): debug defaults and runtime optimization defaults
- [src/config/materialsConfig.js](./src/config/materialsConfig.js): material presets and tweak rules
- [src/config/renderingConfig.js](./src/config/renderingConfig.js): tone mapping and post-processing defaults
- [src/config/viewerConfig.js](./src/config/viewerConfig.js): thin aggregator exported as `VIEWER_CONFIG`

To switch heavy runtime assets from local `public/assets/scene/` to object storage, set:

```bash
VITE_SCENE_ASSET_BASE_URL=https://assets.example.com/university-place
```

See [.env.example](./.env.example) for the expected variable name.

## Project Structure

Recent refactors split the viewer into clearer runtime domains:

- [`src/loaders/`](./src/loaders): asset URL resolution and scene layer loading
- [`src/materials/`](./src/materials): material pipeline, factories, shader patches, texture helpers
- [`src/ui/`](./src/ui): viewer shell creation, DOM refs, menu bindings
- [`src/debug/`](./src/debug): object inspector and override store
- [`src/camera/`](./src/camera): navigation and locomotion runtime

## Deployment

This project builds as a static app and can be served from `dist/`.

`vercel.json` and `.vercelignore` are included for the current Vercel-based demo flow.

## Documentation

Deeper project notes, pipeline decisions, and architecture direction live in [docs/PROJECT_NOTES.md](./docs/PROJECT_NOTES.md).

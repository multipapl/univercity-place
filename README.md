# Three.js Baked Scene Viewer

Lightweight browser viewer for baked Blender scenes exported as `glTF`, with optional layered passes for foliage, glass, reflections, and FX.

## Quick Start

```bash
npm install
npm run dev
```

Open the local Vite URL in your browser.

## Asset Layout

Main scene:

```text
public/assets/scene/scene.glb
```

Optional layers:

```text
public/assets/scene/bg.glb
public/assets/scene/leaf.glb
public/assets/scene/glass.glb
public/assets/scene/reflect.glb
public/assets/scene/fx.glb
public/assets/scene/fire.mp4
public/assets/scene/cubemap.png
```

Supported fallback names are already wired in code for several layers, such as `background.glb`, `alpha.glb`, `leaves.glb`, `foliage.glb`, and `fire.glb`.

Remote asset URLs can also be passed through query params, for example:

```text
http://localhost:5173/?scene=https://your-storage.example.com/scene.glb
```

## Controls

- Click the viewport to capture the mouse.
- `W`, `A`, `S`, `D` move.
- `Shift` speeds up movement.
- `Space` up in fly mode.
- `C` down in fly mode.
- Mouse wheel changes fly speed.
- `Esc` releases pointer lock.
- `M` opens the viewer menu.

## Viewer Features

Current viewer capabilities:

- baked base scene rendering
- optional layered scene loading
- alpha cutout foliage path
- simple glass path
- selective reflection path with `MeshPhysicalMaterial`
- animated fire video override
- runtime viewport controls for tone mapping, exposure, `FOV`, camera height, and reflection tuning
- lightweight performance diagnostics

## Configuration

The main runtime config currently lives near the top of [src/main.js](./src/main.js) in `VIEWER_CONFIG`.

Important groups:

- `sceneLayers`
- `camera`
- `locomotion`
- `runtimeOptimization`
- `materialPresets`
- `materialTweaks`

## Deployment

For a simple demo deployment, this project can be built as a static app:

```bash
npm run build
```

The generated site is served from `dist/`.

`vercel.json` and `.vercelignore` are included for the current Vercel-based demo flow, but heavy production assets are expected to move to object storage later.

## Documentation

Deeper project notes, pipeline decisions, and architecture direction live in [docs/PROJECT_NOTES.md](./docs/PROJECT_NOTES.md).

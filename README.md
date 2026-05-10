# University Place: Emberglass

Scene-specific architectural viewer built with `three` + `vite`.

This runtime is intentionally narrow: fixed scene contract, specialized material paths, one shared web deployment, optional WebXR / VR support, and a lightweight internal debug workflow.

## Quick Start

```bash
npm install
npm run dev
```

Local dev uses Vite with HTTPS enabled so WebXR-capable devices can open the app without a separate HTTPS proxy.

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
- `src/vr/` contains the optional WebXR runtime, teleport navigation, and session lifecycle.
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
- `vr=1`
- `novr=1`
- `safe=1`
- `baseOnly=1`
- `xrQuality=stable|avp|sharp`
- `xrScale=0.5`
- `xrFoveation=1`

## Interaction

- Desktop: click to lock pointer, `WASD` move, `Shift` boost, wheel speed, `Shift` + wheel FOV, `Q` / `E` camera height.
- Mobile: left joystick moves, right pad looks, boost button accelerates.
- VR: immersive WebXR session with teleport locomotion and headset-tracked look.
- `M` toggles the drawer.
- `H` toggles help.
- `Esc` closes overlays or releases pointer lock.

Default locomotion mode is `walk`. If `collision.glb` is present, walk mode uses collision-aware movement.

## VR / WebXR

The same app URL now serves both the normal desktop viewer and the VR-capable runtime.

- Normal desktop / laptop browsers stay on the standard web pipeline.
- VR mode is available through WebXR on supported devices.
- VR-safe runtime settings auto-enable only when immersive VR support is detected, or when forced with `?vr=1`.
- `?novr=1` forces the normal non-VR path even on XR-capable devices.
- Current VR locomotion is teleport-first. Small real-world headset motion works, but larger room-scale movement limits are platform-controlled.

Current validated target:

- Apple Vision Pro in Safari

Notes:

- Firefox should not be treated as the primary VR target for this project.
- Entering immersive mode on headset browsers can still be sensitive to device memory pressure and browser session state.

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

## Production Asset Caching

Current status: no special production caching pipeline is enabled in code yet.

What was confirmed during the caching review:

- the viewer can safely support production-side cache reuse for heavy `glb` / `mp4` / `mp3` assets
- local development should keep aggressive cache-busting behavior
- `assetBust` should remain a manual debug/operator escape hatch, not the normal production path
- service worker / IndexedDB complexity is not justified unless plain HTTP caching proves insufficient

What blocked rollout right now:

- Cloudflare's supported cache path for R2 requires serving the bucket through a custom domain, not the `r2.dev` development URL
- this project is intentionally staying on the simpler current delivery path for now rather than introducing domain, R2 metadata, and cache purge operational steps

Deferred future direction:

- keep asset filenames stable on object storage
- use a tiny asset manifest or equivalent version signal to invalidate heavy asset URLs only when the scene package really changes
- pair that with long-lived immutable cache headers on the heavy files themselves
- if assets are overwritten in place behind Cloudflare cache, plan for explicit cache purge as part of deploy operations

## Internal Notes

Local docs in `docs/` are ignored by git and intentionally kept small. The main ones are:

1. `docs/PROJECT_NOTES.md`
2. `docs/performance-review-2026-05-09.md`
3. `docs/vr-mode-run-guide.md`

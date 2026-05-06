# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Meta-rules for this file

- Update this file after every commit if the architecture, conventions, or key file roles changed.
- Keep it under 150 lines. Be concise. Remove stale entries, do not accumulate.

## Project overview

Baked-scene architectural viewer — delivery viewer, not a generic editor. Intentionally narrow: fixed layered asset contract, stable naming, specialized material paths. Stack: Three.js + Vite, vanilla JS, deployed on Vercel.

Tests use Node's built-in `node:test` + `node:assert/strict` (no jest/vitest). Run a single file: `node --test tests/<file>.test.js`.

## Architecture

### Integration hub

`src/viewer/createViewerApp.js` — composes the entire runtime. Creates renderer, scene, camera, all subsystems, wires events. Entry via `src/main.js`.

### Config (`src/config/`)

All config merges into `VIEWER_CONFIG` exported from `viewerConfig.js`. Never import individual config files from outside `src/config/` — go through `VIEWER_CONFIG`.

- `assetsConfig.js` — **single source of truth for all asset paths.** `VITE_SCENE_ASSET_BASE_URL` env var switches local (`/assets/scene`) vs remote (R2/CDN). Asset contracts carry `id`, `searchParam`, `localPath/remotePath`, `url`, and a `runtime` flags bag (`applyFireVideoTexture`, `enableBloom`, `registerAsBackgroundRoot`, etc.) — these flags drive loader and pipeline behavior without hardcoding layer logic elsewhere. Also exports `RENDERS_BASE_URL` and `LOADING_BACKGROUND_URL` for render gallery and loading screen background.
- `materialsConfig.js` — `MATERIAL_TWEAKS` (name-based mesh/material matching, the extension point for per-object visual adjustments) and `MATERIAL_PRESETS` (numeric constants per material type).

### Loaders (`src/loaders/`)

- `assetResolver.js` — pure URL helpers. Query-string layer overrides (`?scene=`, `?glass=`, etc.) resolved here.
- `sceneLayerLoader.js` — sequential GLB layer loading, fires callbacks into the viewer for camera spawn, layer toggles, loading screen, texture optimizations.

### Material pipeline (`src/materials/`)

- `materialPipeline.js` — dispatches mesh conversion to per-type factories, owns the `onBeforeCompile` hook chain (state stored in `material.userData.viewerCompileHookState`), applies `MATERIAL_TWEAKS` by substring name match.
- `factories/` — one file per mode: `baked`, `background`, `unlitAlpha`, `alphaCutout`, `glass` (MeshPhysicalMaterial + transmission), `reflect`, `windows`, `emissive`, `fx`.
- `shaderPatches/` — GLSL injection: translucency (fake subsurface for foliage), fire video (HSV + luma remap), shared viewer patch.
- `reflectionEnvironment.js` — creates PMREM env map, delegates to probe manager when probes are available. No longer depends on a separate `cubemap.png` file.
- `probeEnvironmentManager.js` — multi-probe env map system. Loads `probes.glb` with `probe_*` named nodes carrying panorama textures, converts to PMREM, assigns closest probe to each mesh by distance. Used by reflect, glass, and windows layers.

### Viewer subsystems (`src/viewer/`)

- `createViewerState.js` — all mutable runtime state as plain objects mutated in place (no reactive framework).
- `createViewerLifecycle.js` — render loop, resize, teardown.
- `createViewerUiController.js` — applies state to DOM and Three.js (tone mapping, bloom, camera, material uniforms).

### UI (`src/ui/`)

- `createViewerShell.js` — builds the full DOM skeleton: loading screen (background image + progress bar + title), HUD, crosshair, mobile controls. Loading screen uses `LOADING_BACKGROUND_URL` with CSS blur + vignette overlay. Google Font "Cormorant Garamond" for title.
- `galleryOverlay.js` — full-screen render gallery with auto-discovery of stills from `RENDERS_BASE_URL`.
- `menuController.js` — sidebar/dock menu orchestration.
- `bottomDock.js`, `leftSidebar.js` — dock and sidebar panel factories.

### Other subsystems

- `src/camera/navigationController.js` — PointerLock FPS (desktop) + virtual joystick (mobile), walk/fly modes. Right-click hold triggers 2x zoom magnification.
- `src/postprocessing/createSelectiveBloomPipeline.js` — bloom on a dedicated Three.js layer, composited over base.
- `src/debug/` — raycaster object picker, per-mesh HSV overrides, persists to `public/debug.scene-overrides.json` via dev-only Vite POST endpoint `/__debug/scene-overrides`.
- `src/utils/threeDisposal.js` — recursive geometry/material/texture disposal.

## Key conventions

- `shouldAppendAssetQuery()` (`createViewerApp.js:307`) intentionally skips cross-origin URLs — cache-bust query only appended to same-origin assets.
- Debug mode is URL-driven (`?debug=1`), not stored in localStorage.
- `MATERIAL_TWEAKS` substring match is case-insensitive; it's the correct place to add per-object adjustments.
- Draco decoder is in `public/draco/` and stays on Vercel — never moves to R2.
- `three` is split into its own Rollup chunk in `vite.config.js`.

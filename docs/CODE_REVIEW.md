# Code Review - Three.js Baked Scene Viewer

**Date:** 2026-05-02
**Scope:** Full project code review
**Branch:** `dev`

---

## Summary

The project is a Three.js-based architectural scene viewer with multi-layer GLTF loading, selective bloom post-processing, custom shader material pipeline, debug object inspector, and mobile touch controls. The codebase is well-structured after recent refactoring (config split, material factories, UI extraction). Below are the issues found, ordered by severity.

---

## Critical Issues

### 1. No resource disposal — GPU memory leaks

**Files:** `src/main.js`, `src/loaders/sceneLayerLoader.js`, `src/materials/materialPipeline.js`

There is no `dispose()` logic anywhere in the project:
- The renderer, effect composers, render targets, and PMREM generator are never disposed.
- When `convertMeshForLayer` replaces `mesh.material`, the original GLTF material is discarded without calling `.dispose()`.
- `cleanupLoadedRoots()` in `sceneLayerLoader.js:64-75` removes roots from the scene tree but never calls `.dispose()` on geometries, materials, or textures — this leaks GPU-allocated buffers.
- The fire `<video>` element (`fxState.videoElement`) is never paused, `src`-cleared, or removed from the DOM on cleanup.
- `backgroundState.materials`, `fireState.materials`, and `reflectionState.materials` Sets accumulate materials but never remove them.
- PMREM render targets from `reflectionEnvironment.js:53` (`fromEquirectangular`) are used for their `.texture` but the render target itself is never disposed.

**Impact:** GPU memory grows unboundedly on scene reloads or HMR cycles. Users on low-memory devices (mobile, integrated GPU) will experience crashes over time.

### 2. No animation loop cancellation

**File:** `src/main.js:1054-1072`

`requestAnimationFrame(animate)` starts a rendering loop with no handle saved — there is no way to cancel it. If the viewer needs to be stopped, unmounted, or reinitialised (e.g., HMR, SPA route change), the loop continues rendering on a stale/disposed renderer.

### 3. No error boundary for initialization

**File:** `src/main.js:28-1087`

All initialization runs at module level. If any synchronous call throws (e.g., WebGL context creation fails, DOM element missing), the loading screen stays visible forever with no user feedback. Only `loadSceneLayers()` has a try-catch.

---

## High-Severity Issues

### 4. Sequential layer loading — unnecessary latency

**File:** `src/loaders/sceneLayerLoader.js:216`

Layers are loaded serially with `for (const layer of prioritizedLayers) { await gltfLoader.loadAsync(...) }`. Independent layers (e.g., `glass`, `alpha`, `fx`) could be loaded in parallel using `Promise.allSettled`, reducing total load time by 2-4x on multi-asset scenes.

### 5. Stuck keyboard input on focus loss

**File:** `src/camera/navigationController.js:376-399`

Keys are tracked via `keys.add(event.code)` on `keydown` and `keys.delete(event.code)` on `keyup`. If the browser window loses focus while a key is held (e.g., Alt-Tab), the `keyup` event never fires and the camera drifts indefinitely. The existing `focus` event handler (line 431) only resumes video, not clears keys.

**Fix:** Add `window.addEventListener("blur", () => keys.clear())`.

### 6. Event listener accumulation — no cleanup

**Files:** `src/camera/navigationController.js`, `src/debug/debugObjectInspector.js`, `src/ui/debugPanelBindings.js`

`bindInputEvents()`, `bindUi()`, and `bindViewerUiEvents()` add listeners to `window`, `document`, and DOM elements but never provide removal functions. If any of these modules are re-created (HMR, dynamic re-init), listeners accumulate.

### 7. Canvas leak in texture size capping

**File:** `src/materials/textureUtils.js:109-121`

`applyTextureSizeCap()` creates a new `<canvas>` element and `CanvasRenderingContext2D` each time a texture is re-capped (e.g., changing the cap setting at runtime). Previous canvases assigned to `texture.image` are abandoned but may not be garbage collected promptly due to GPU references.

### 8. Mutable global config object

**File:** `src/main.js:244-249, 857, 875`

`VIEWER_CONFIG` is mutated at runtime from multiple places: URL params, localStorage reads, UI slider callbacks, and `applyCameraSettings`. This makes state flow difficult to trace and debug. Config should be read-only after initialization, with runtime state tracked separately.

---

## Medium-Severity Issues

### 9. Duplicated GLSL HSV conversion code (3 copies)

**Files:**
- `src/materials/factories/makeBackgroundMaterial.js:54-66` — `viewerRgbToHsv / viewerHsvToRgb`
- `src/materials/shaderPatches/applyFireVideoMaterialPatch.js:33-43` — `viewerFireRgbToHsv / viewerFireHsvToRgb`
- `src/materials/debugMaterialOverrides.js:78-89` — `viewerDebugRgbToHsv / viewerDebugHsvToRgb`

Same algorithm, three copies with different prefixes. Should be extracted into a shared GLSL snippet string.

### 10. `main.js` still too large — 1087 lines

Despite good modular extraction, `main.js` still orchestrates ~40 functions and manages 6+ state objects. The bloom pipeline setup (lines 142-195), the `apply*Settings` family (14 functions), and the state initialization could be further extracted. The file acts as both the entry point and the application state container.

### 11. Forward reference: `updateStatus` used before definition

**File:** `src/main.js:331 → definition at 410`

`updateStatus` is passed to `createReflectionEnvironmentManager()` at line 331 but defined at line 410. This works because it's called asynchronously later, but it creates a fragile dependency on call timing. If any factory called `updateStatus` synchronously during construction, it would crash.

### 12. Bloom pipeline always allocated

**File:** `src/main.js:177-195`

The full bloom pipeline (2 EffectComposers, render targets, passes) is always created even when `selectiveBloom.enabled = false` or `strength = 0`. This wastes GPU memory for the render targets.

### 13. `.env` not in `.gitignore`

**File:** `.gitignore`

The `.gitignore` lists `node_modules/`, `dist/`, log files, and `docs/`, but not `.env`. If a developer creates a `.env` file with secrets (API keys, CDN tokens), it could be accidentally committed.

### 14. `docs/` directory excluded from version control

**File:** `.gitignore:5`

The `docs/` directory is in `.gitignore`, meaning documentation (including this review, `PROJECT_NOTES.md`, `REFACTOR_SPEC_PHASED.md`) is not tracked in git. These design documents should be version-controlled.

### 15. No loading progress indicator

**File:** `src/ui/createViewerShell.js:271`

The loading bar uses a pure CSS animation (`loading-slide`). It gives no indication of actual loading progress. The `THREE.LoadingManager` supports `onProgress` callbacks that could drive a real progress bar.

### 16. `renderer.info` accuracy with multi-pass rendering

**File:** `src/main.js:1062-1069`

The diagnostics read `renderer.info.render` which accumulates across all render calls per frame. With selective bloom enabled, there are 2-3 render passes per frame (bloom composer + final composer OR direct render). The reported draw calls and triangles may be 2-3x the actual scene complexity.

---

## Low-Severity Issues

### 17. Hardcoded `window.innerWidth / window.innerHeight`

**Files:** `src/main.js:117,179`, `src/camera/navigationController.js:312-315`

Renderer and camera use window dimensions directly. If the viewer is embedded in a non-fullscreen container, this breaks. Should use the viewport container's `clientWidth/clientHeight`.

### 18. `parsePositiveInteger` name is misleading

**File:** `src/main.js:223-234`

The function allows `0` (since check is `parsed < 0`), but the name says "positive". Zero is not positive. The function is used for texture cap where 0 means "disabled", so the behavior is correct but the name is confusing.

### 19. `BoxHelper` always in scene graph

**File:** `src/debug/debugObjectInspector.js:25-31`

The debug `hoverHelper` is added to `sceneRoots` at construction time, even when debug mode is off. While invisible, it's still traversed during scene operations (render, raycasting, bounds computation).

### 20. `getMaterialEntries()` called without caching

**File:** `src/debug/debugObjectInspector.js:49-76`

`getMaterialEntries()` fully traverses all loaded layers every time it's called. It's invoked in `resolveSelectedEntry()`, `applyOverridesToLoadedLayers()`, and `findMaterialEntryByKey()` — sometimes multiple times per user interaction.

### 21. `menuCloseButton` ref collected but not passed explicitly

**File:** `src/ui/viewerDomRefs.js:6`

`menuCloseButton` is collected in `collectViewerDomRefs` but not destructured in `main.js`. It works because `refs` is passed to `bindViewerUiEvents`, but the inconsistency between explicit destructuring and pass-through is confusing.

### 22. No `<meta name="description">` or social meta tags

**File:** `index.html`

The HTML has only a `<title>`. For a viewer that may be shared via URL, adding `<meta name="description">`, Open Graph, and Twitter Card tags would improve link previews.

### 23. Missing cursor styles for interactive elements

**File:** `src/style.css`

Buttons (`.action-button`, `.menu-toggle`, `.menu-close`) and checkboxes don't have `cursor: pointer`. Mobile buttons and the look pad also lack touch feedback beyond the `.is-active` class.

### 24. `RoomEnvironment` fallback scene disposal may be incomplete

**File:** `src/materials/reflectionEnvironment.js:20-25`

`reflectionEnvironmentScene.dispose()` is called on the `RoomEnvironment` scene, but `Scene.dispose()` in Three.js does not recursively dispose children's geometries and materials. The room geometry and material may leak.

### 25. `vercel.json` cache headers assume immutable assets

**File:** `vercel.json:7-24`

All scene assets get `max-age=31536000, immutable`. If assets are updated without changing filenames, users will get stale cached versions. The `?v=...` query parameter busting helps, but CDNs that strip query strings would serve stale content.

### 26. No `robots.txt` or `sitemap.xml`

If deployed publicly, search engine crawlers will try to index the page. A `robots.txt` might be appropriate if the viewer is intended to be private/unlisted.

---

## Code Quality Observations (non-blocking)

### Positive aspects
- Clean module boundaries after the refactoring series.
- Material factory pattern (`makeBakedMaterial`, `makeGlassMaterial`, etc.) is well-designed and extensible.
- The shader compile hook system (`getMaterialCompileHookState` / `setMaterialCompileHook`) is a solid pattern for composable shader modifications.
- Touch/mobile controls are well-implemented with proper touch identifier tracking.
- The `objectOverrideStore` is a clean, testable data layer.
- Good use of `frustumCulled` optimization per material mode.
- Config split into domain files (`cameraConfig`, `materialsConfig`, etc.) is clean.

### No test coverage
There are zero test files in the project. The following modules would benefit most from unit tests:
- `objectOverrideStore.js` — pure data logic, easy to test.
- `assetResolver.js` — URL manipulation, easy to test.
- `textureUtils.js` — texture normalization logic.
- `debugMaterialTargeting.js` — path building logic.
- `navigationController.js` — movement math.

### No TypeScript
The project uses plain JavaScript without JSDoc type annotations. For a project with this many inter-module contracts (material pipeline options, config shape, state objects), TypeScript or at minimum JSDoc `@typedef` declarations would catch type errors at build time.

---

## Priority Recommendations

| Priority | Issue | Effort |
|----------|-------|--------|
| P0 | Add resource disposal (geometries, materials, textures, video, renderer) | Medium |
| P0 | Save `requestAnimationFrame` handle for cancellation | Trivial |
| P1 | Clear keyboard input on `blur` event | Trivial |
| P1 | Add `.env` to `.gitignore` | Trivial |
| P1 | Parallel layer loading | Small |
| P1 | Wrap init in try-catch with user-visible error | Small |
| P2 | Extract duplicated GLSL code | Small |
| P2 | Lazy bloom pipeline allocation | Medium |
| P2 | Add unit tests for pure modules | Medium |
| P2 | Track `docs/` in git (remove from `.gitignore`) | Trivial |
| P3 | Extract remaining logic from `main.js` | Large |
| P3 | Use container dimensions instead of window | Small |
| P3 | Real loading progress | Small |

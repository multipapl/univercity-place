# Three.js baked scene viewer

Minimal browser viewer for baked Blender scenes exported as `glTF`, with optional layered passes for alpha cutouts, glass, and FX.

## Quick start

```bash
npm install
npm run dev
```

Open the local URL from Vite in your browser.

## Vercel deploy

Fastest demo path for this project:

1. Keep the viewer and scene assets in the same repo.
2. Put the final files in `public/assets/scene/`.
3. Push the repo to GitHub.
4. Import the repo into `Vercel`.
5. Let `Vercel` use:
   `build command`: `npm run build`
   `output directory`: `dist`

This repo already includes:

- `vercel.json` with static cache headers for scene assets
- `.vercelignore` that skips local debug files and build output

Practical note:

- The current same-origin setup is the least painful deployment path.
- For this demo, serving `scene.glb`, `leaf.glb`, `bg.glb`, `glass.glb`, `fx.glb`, and `fire.mp4` directly from `Vercel` is simpler than mixing the viewer with `Google Drive`.
- You do not need `Vercel Blob` for the current setup.
- If the project grows much larger later, object storage can be added as a later optimization, but it is not part of the recommended first deployment path for this repo.

## Where to put your scene

Put your main baked scene here:

```text
public/assets/scene/scene.glb
```

or here:

```text
public/assets/scene/scene.gltf
```

Preferred option is `GLB` because it keeps geometry and textures packed together in one file.

Optional extra layers can live next to it:

```text
public/assets/scene/alpha.glb
public/assets/scene/glass.glb
public/assets/scene/fx.glb
```

The viewer auto-detects these layer files if they exist. You can also use `leaf.glb`, `leaves.glb`, `foliage.glb`, or `fire.glb` for the matching optional pass names already wired in code.

You can also load a remote scene URL:

```text
http://localhost:5173/?scene=https://your-storage.example.com/scene.glb
```

For remote files, the storage must allow CORS requests from your viewer domain.

Optional remote layer overrides work the same way:

```text
http://localhost:5173/?scene=https://your-storage.example.com/scene.glb&alpha=https://your-storage.example.com/alpha.glb&glass=https://your-storage.example.com/glass.glb&fx=https://your-storage.example.com/fx.glb
```

## Controls

- Click inside the viewport to capture the mouse.
- `W`, `A`, `S`, `D` to move.
- `Space` up.
- `C` down.
- Hold `Shift` to move faster.
- Mouse wheel changes fly speed.
- `Esc` releases the mouse cursor.

## Viewer config

The main tuning block lives near the top of `src/main.js` in `VIEWER_CONFIG`.

- `locomotion.mode`: switch between `"walk"` and `"fly"`.
- `locomotion.startPosition`: set exact spawn coordinates from Blender, for example `{ x: 2.4, y: 1.7, z: -5.2 }`.
- `locomotion.startLookAt`: optional point the camera should face on load.
- `materialTweaks`: tweak selected materials in code, for example panorama/background brightness and saturation.
- `sceneLayers`: define the layered scene filenames and which material mode each layer should use.
- `materialPresets`: adjust defaults for alpha cutout threshold, simple glass opacity, and FX alpha behavior.

If `startPosition` is `null`, the viewer auto-spawns from the scene bounds and clamps the camera to a simple walk height in walk mode.

## Blender export notes

- Preferred export: `File -> Export -> glTF 2.0 -> Format: GLB`.
- If your scene is fully baked, keep the baked texture in the material's base color.
- The viewer converts imported materials to `MeshBasicMaterial`, so the baked look is shown without realtime lights or shadows.
- If you export as `.gltf`, keep the generated `.bin` file and texture folder next to it.
- For sharing large scenes publicly, a good setup is often: lightweight viewer on a static host, heavy `.glb` on object storage.

## Research notes

Current state of the experiment:

- The viewer works well as a lightweight baked-scene browser on desktop, phone, and Apple Silicon laptops.
- `DRACO` compressed `GLB` files load correctly in this project.
- Remote scene loading already works through the `?scene=` URL parameter.
- The current viewer supports walk mode, mobile controls, layered scene loading, and optional viewport tone mapping controls.

Important findings from this round:

- The biggest visual mismatch is likely not Three.js alone. A large part of the issue seems to come from the Blender bake and export pipeline.
- `SimpleBake` + `Cycles Bake` appears to be the correct direction for this workflow, not the simpler PBR bake path.
- `Create glTF Settings` in `SimpleBake` is useful for `glTF` export metadata like AO/lightmap-style wiring, but it is not a general color-fix button.
- A newer export of the scene showed `KHR_materials_unlit`, `KHR_materials_emissive_strength`, and `KHR_draco_mesh_compression`, which is a strong sign that the material/export side got closer to the intended web format.
- A previous black-scene issue in the viewer was fixed by treating textured baked materials with a white tint multiplier instead of preserving a possibly black base color factor.

Color pipeline conclusions so far:

- `Cycles Bake` does not automatically bake Blender display transforms like `ACES`, `AgX`, or viewport exposure into the resulting texture.
- Blender viewport color management and browser tone mapping are not matching one-to-one right now.
- Built-in Three.js tone mapping can be useful for experimentation, but it is not guaranteed to reproduce Blender `ACES 2.0` exactly.
- Baking to `EXR` may still be useful as a master/intermediate workflow, but it did not immediately solve the look-matching problem in this test round.
- The first simpler pipeline produced the closest result so far, even though it was still not a proper match.

SimpleBake-specific observations:

- `Background`-based baked materials exported to `glTF` can change how maps are wired, so loader-side assumptions must stay flexible.
- `SimpleBake` documentation and release notes suggest there are edge cases around UV choice, output nodes, and color handling.
- If baked images look correct in Blender `Image Editor` but not in the exported scene, the problem is probably after bake.
- If baked images already look wrong in `Image Editor`, the problem is still inside Blender/SimpleBake before export.

Known open questions for the next session:

- Why the baked result drifts away from the Blender reference in contrast, saturation, and highlight handling.
- Whether the best production path is:
  baked final-look textures for the web, or
  linear float master textures plus a later controlled transform.
- Whether `SimpleBake` has one small missing option or scene-prep step that makes the whole workflow click.
- Whether the remaining mismatch is mostly:
  bake setup,
  save/export settings,
  `glTF` material conversion,
  or display transform differences.

Suggested next debug order:

- Verify the baked images in Blender `Image Editor` first.
- Export a small subset of the scene instead of the whole project.
- Compare one or two key materials only:
  background,
  walls,
  one bright problem asset.
- Keep the web viewer simple while the Blender-side pipeline is still being isolated.

## Pipeline notes for next pass

Current recommendation for this project:

- Keep the main environment mostly baked.
- Treat the current viewer as a baked-scene viewer first, not a full realtime renderer.
- Add realtime `PBR` only for a small set of hero objects where moving reflections really matter.
- Treat animated fire, screens, and other FX as a separate pass after the baked look is stable.

Recommended scene split:

- `static_baked.glb`: walls, floors, ceiling, furniture, and most environment meshes.
- `hero_pbr.glb`: a small number of metallic or glossy objects that need realtime response.
- `fx.glb`: fire cards, animated planes, emissive accents, or later VFX experiments.

Recommended material logic:

- Baked environment: final baked look in base color or unlit-style output.
- Hero `PBR` objects: `baseColor`, `normal`, `roughness`, `metalness`, optional `ao`, optional `lightMap`.
- Do not mix full beauty-bake and full realtime lighting on the same important surface unless there is a specific reason. It often causes double-lighting and muddy highlights.

Leaf / foliage contract currently working in this viewer:

- Export foliage as a separate leaf layer such as `leaf.glb`, `leaves.glb`, `foliage.glb`, or `alpha.glb`.
- Keep foliage as `Alpha Clip` / cutout, not soft translucent blend, for the main production path.
- Use the baked atlas in `Base Color`.
- Route the opacity mask through `Roughness` in Blender before `glTF` export.
- Mark the opacity texture as `Non-Color`.
- Keep foliage double-sided.
- In the current viewer import path, `roughnessMap` is reused as the alpha mask source for foliage materials.
- This workaround exists because some Blender -> `glTF` exports do not preserve the desired separate alpha setup in a directly usable way for the web viewer.
- If foliage still shows dark fringes or dark cards, suspect atlas background / compression / mip bleed before suspecting scene lighting.

Fire / FX contract currently working in this viewer:

- Keep animated fire in the `fx` layer, for example `fx.glb` or `fire.glb`.
- The simplest current path is:
  `fx.glb` for the plane geometry and alpha-mask material wiring,
  plus a companion `fire.mp4` next to it for the animated color.
- If the fire video already has a mostly black background, the viewer can derive alpha directly from video brightness, similar to a simple `ColorRamp` key, so a separate alpha mask is optional.
- In Blender, keep the fire plane as a normal mesh with a simple material.
- Put the fire color animation in a separate `MP4` file:
  `public/assets/scene/fire.mp4`
- If you need a cutout mask, route the opacity mask through `Roughness` before export, similar to the current foliage workaround.
- Name the fire mesh or material with a token like `FIRE`, `FLAME`, or `EMBER` so the viewer knows which `fx` material should receive the video texture override.
- The viewer will automatically try `fire.mp4`, `fire.webm`, `fx.mp4`, or `fx.webm`.
- You can also point to a remote fire video with:
  `?fireVideo=https://your-storage.example.com/fire.mp4`

Runtime memory safety tools currently in the viewer:

- `Low-memory base textures` disables mipmaps on the baked base layer.
- `Base Texture Cap` can hard-limit the baked base layer texture size in runtime to `4096`, `3072`, `2048`, or `1024`.
- These controls are emergency runtime compromises for weaker machines.
- The cleaner production solution is still to rebake less important assets at lower resolutions instead of relying on aggressive runtime downscaling.

Reflections and `PBR` notes:

- Realtime metal needs an environment map to look convincing.
- For hero metallic objects, a good first target is not "the whole scene reflects itself perfectly", but "the material has believable realtime response".
- The practical path is usually a fake or authored reflection source:
  HDRI,
  reflection probes,
  or a scene-derived environment capture.
- Baking reflections directly into the main color texture is acceptable for static non-hero assets, but usually looks wrong on noticeable moving-camera metal objects.
- Lightmaps can help add baked lighting to `PBR` assets, but they are not a replacement for proper reflection response.

Draw call and material budget notes:

- Roughly `70-75` materials / draw calls is not automatically a problem for this project.
- For a desktop-focused baked viewer, that number is reasonable.
- For mobile, it is still workable if textures, transparency, and shader cost stay under control.
- Triangle count alone is not the main risk here. The bigger web risks are usually:
  too many separate meshes,
  too many large textures,
  too much transparency,
  video textures,
  and expensive realtime materials on too many objects.
- "One object = one material" is a healthy rule for this pipeline as long as it does not create unnecessary extra splits.
- The current scene estimate of about `700k` triangles sounds comfortable relative to the stated `5M` ceiling, but the real test is browser performance on target hardware.

Practical production direction:

- First lock the baked pipeline and visual match with Blender.
- Then identify only the few objects that really deserve realtime `PBR`.
- Then add reflection support for those hero objects.
- Test lightmap resolution pragmatically:
  `4K` may be enough for many large assets,
  `8K` should be justified by a visible gain because browser memory cost rises quickly.
- Keep tomorrow's coding goal narrow: move from "fully baked only" toward "mostly baked plus a few selective realtime materials".

## Session summary

Compressed summary of the current understanding:

- `Three.js` is the correct direction for this project.
- `WebGL` is the low-level graphics API; `Three.js` is the higher-level rendering framework built on top of that layer.
- The current viewer is intentionally a baked-scene viewer and converts imported materials to `MeshBasicMaterial`.
- The current viewer now supports separate `baked`, `alpha cutout`, `glass`, and `fx` layer behaviors during import.
- Because of that, current realtime `PBR`, dynamic light response, and metallic reflections are not active yet in this viewer.
- Video or other animated textures are possible later in `Three.js`, but they are not the current priority.
- The healthiest production direction is a hybrid pipeline:
  mostly baked environment,
  selective realtime `PBR` hero objects,
  and separate FX where needed.

Current practical recommendation:

- Keep most of the scene baked.
- Use realtime `PBR` only where moving reflections or gloss response are visually important.
- Avoid trying to make the whole environment fully realtime if the core goal is high visual fidelity close to the Blender reference.
- Treat fire, leaf tricks, glass tricks, and other special cases as separate implementation passes after the base baked pipeline is stable.

## Working assumptions about the client pipeline

These are assumptions, not confirmed facts yet:

- The client pipeline is probably based on `Blender` export plus `SimpleBake` or a similar bake-heavy preparation step.
- Their content likely gets split by material behavior:
  fully baked environment,
  separate glass,
  separate foliage,
  and selective realtime materials.
- Their delivery flow likely involves exporting assets and assembling them in a `Xcode`-based Apple Vision Pro / visionOS workflow.
- That does not automatically mean the renderer is native `RealityKit`; it may still be a web-based viewer shell using `Three.js` + `WebXR` inside a custom launcher or app wrapper.
- Current confidence is high that their system is closer to a custom web/XR stack than to an `Unreal`-style runtime.

## Performance guidance

Working rough thresholds for this project:

- `70-75` materials / draw calls is not automatically too much for this kind of baked web viewer.
- About `700k` triangles sounds healthy for the current target, assuming textures and shader cost stay under control.
- For web, texture memory is often the real bottleneck earlier than triangle count.
- `4K` textures are a sensible default ceiling for important baked assets.
- `8K` textures should be used only when justified by visible gain and validated on target hardware.

The metrics that matter most for future testing:

- frame time / `FPS`
- draw calls
- visible triangles per frame
- texture memory pressure
- transparency / overdraw
- cost of any future video textures or realtime hero materials

## VR and Vision Pro direction

Long-term conclusion:

- This project can plausibly evolve toward `Apple Vision Pro`.
- The most realistic bridge from the current viewer is `Three.js` + `WebXR`.
- If the client is using `Xcode`, that may simply be because their final launcher or wrapper is built in the Apple toolchain.
- The current scene and asset preparation work is still useful even if the final presentation layer is spatial or immersive.

Practical implication:

- Keep the scene structure modular.
- Do not hardwire all viewer logic to mouse-and-keyboard assumptions forever.
- Expect future input and presentation differences if the project moves into XR.

## Next coding session goals

The next implementation pass should stay focused and practical:

- Keep the current baked viewer working.
- Start preparing a mixed-material path instead of forcing every mesh into baked-only rendering.
- Add easy-to-edit configuration values in code for visual tuning.
- Prefer exposing key values in one place instead of requiring code edits all over the file.

Likely tunable parameters we will want:

- tone mapping mode
- exposure
- material-level overrides for selected meshes
- future environment / reflection intensity for hero `PBR` objects
- future light intensities only if and when realtime-lit materials are introduced

Important reminder for future work:

- In the current baked-only viewer, values like `ambient light` are not meaningful yet because the scene is converted to `MeshBasicMaterial`.
- If we want editable lighting controls, we first need a viewer path that preserves or rebuilds realtime-lit materials for selected assets.

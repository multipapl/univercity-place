# Project Notes

## Purpose

This project is a custom web viewer for specific baked 3D scenes.
It is not intended to become a generic engine.

The main goal is:

- strong visual result
- pragmatic performance
- predictable pipeline
- enough flexibility to support scene-specific tricks without turning the project into a full game framework

## Current Rendering Direction

The viewer is no longer purely "beauty baked only".
It is evolving into a hybrid pipeline with different material paths for different asset classes.

Current practical classes:

- `baked`
- `alphaCutout`
- `glass`
- `reflect`
- `fx`

This is intentional.
Different materials and scene elements need different treatment.

## Core Pipeline Principles

- Keep most of the environment baked.
- Add realtime response only where it clearly improves the result.
- Prefer cheap, convincing tricks over expensive physical correctness.
- Do not force one universal rendering strategy onto every object.
- Optimize for web delivery first.

## Reflection Pass

The current reflection pass is a selective hero-material path, not a full-scene realtime lighting system.

Current contract:

- optional `reflect.glb` / `reflect.gltf`
- imported as `MeshPhysicalMaterial`
- baked no-gloss color goes into `Base Color`
- roughness uses `UV1`
- color uses `UV0`
- optional cubemap comes from `cubemap.png` / `.jpg` / `.jpeg`
- reflection environment is processed through `PMREM`

This path is intended for materials such as:

- glossy appliances
- faucets
- metallic fixtures
- polished ceramic or similar reflective surfaces

It is not intended for the whole scene.

Future reflection direction:

- start with explicit per-room probe switching
- optionally move later toward neighboring probe blending / box-projected cubemap correction

## Baked vs Hybrid vs Lightmap+PBR

Working production view:

- `Full beauty bake` is the cheapest runtime path and remains the foundation for simple surfaces.
- `Hybrid baked base + runtime material response` is already working and is likely the right path for many reflective assets in this scene.
- `Pure lightmap + PBR` is worth considering only for specific problem surfaces, not as a blanket migration for the whole project.

Large difficult surfaces such as floors or ceilings may later justify a more flexible lightmap-style path if beauty bake resolution becomes the main bottleneck.

## Foliage and Thin Materials

Foliage is expected to remain a separate production path.

Current direction:

- alpha clip / cutout first
- keep it cheap
- avoid soft blended transparency as the default

For thin translucent materials such as curtains or selective leaves, the right direction is not full offline-style subsurface scattering.
The right direction is likely a cheap game-style fake translucency / backlight approach, only where it adds clear value.

## FX and Animated Life

Small animated elements add a lot of perceived life to the scene.

Current strong examples:

- animated fire
- reflective response on glossy hero objects

Future background / sky direction should follow the same rule:

- do not brute-force realism
- move only the layer that needs to feel alive
- use game-style tricks such as UV panning, cloud drift, or controlled layered motion

## Instancing

Full scene-specific bake and true instancing conflict with each other.

Because of that:

- architecture can stay baked
- repeat-heavy assets need their own strategy
- vegetation and dense repeats should not depend on unique per-instance full-scene beauty bakes

This project should stay focused on the current static scene pipeline first.
A generic instancing-heavy content system is not a current target.

## Audio

Audio is feasible in this stack and is not expected to be a major technical problem.

Best candidates:

- ambient room bed
- positional fireplace sound
- a few local sound sources

Footsteps are possible too, but they are a later polish feature, not a first priority.

## Interactivity

Interactive logic is fully possible in this app.

Examples that are realistic in this stack:

- trigger zones
- click interactions
- object state changes
- camera moves
- sound triggers
- UI overlays
- variant switches

This does not mean the project should become a game.
It only means the viewer is a normal programmable web app with a 3D scene.

## Debug / Editor Direction

The right long-term debug tool is not a full scene editor.
It is a lightweight local inspector/editor for runtime overrides.

Useful direction:

- local-only debug mode
- enabled through local config / local storage
- mesh picking in viewport
- selected object inspector
- runtime override editing
- export of overrides into a friendly configuration format

Likely flow:

- edit locally
- store temporary state in `localStorage`
- export final overrides
- fold approved overrides back into project config

Full editor functionality should not be exposed to normal production users.

## Architecture Direction

The current single-file `main.js` MVP served its purpose, but the project is already large enough to justify modularization.

Priority refactor direction:

1. move config out of `main.js`
2. isolate material factories
3. isolate reflection environment logic
4. isolate scene layer loading
5. isolate camera and movement
6. split HUD / debug UI into smaller modules

The goal is not overengineering.
The goal is to make the project maintainable over the next weeks.

## Suggested Module Shape

```text
src/
  config/
  core/
  loaders/
  materials/
  camera/
  ui/
  diagnostics/
  utils/
```

This is a direction, not a strict mandate.

## Naming and Contracts

The project now depends on naming and layer contracts enough that a stable naming convention should be agreed before more pipeline work continues.

This includes:

- scene layer file names
- mesh naming for special treatment
- material naming for FX / reflect targeting
- future config keys for overrides and probes

Inconsistent naming will keep creating friction unless this is formalized.

## Asset Hosting

Heavy runtime assets should not live permanently in GitHub history or in personal demo hosting accounts.

The intended long-term delivery shape is:

- code in git
- heavy assets in object storage
- static app deployed separately

Current preferred direction:

- local development uses local files
- staging / production uses object storage
- asset URLs are driven by one configurable base path

That means:

- local workflow stays fast
- cloud storage is used as a publish target, not as a live editing workspace

## Storage Direction

For web-first delivery, object storage is the correct fit, not a traditional database.

Current preferred candidate:

- `Cloudflare R2`

Reasons:

- free egress
- S3-compatible workflow
- good fit for web scene assets
- reasonable free tier for small development-stage projects

As of the current discussion, R2 free tier includes:

- `10 GB-month` storage
- `1 million` Class A requests / month
- `10 million` Class B requests / month
- free egress to the Internet

Production policy should eventually separate:

- personal demo hosting
- studio-owned or client-owned production hosting

## Product Mindset

This project is web-first.
VR compatibility is interesting, but not the main design center.

The key value of the web target is accessibility:

- easier sharing
- wider audience
- lower friction than headset-specific delivery

All future decisions should keep that in mind.

## Final Practical Takeaway

The current direction is healthy:

- do not build a generic engine
- do not chase full offline equivalence
- do not force one rendering mode on everything
- keep a baked foundation
- mix in selective realtime features where they matter
- improve the authoring and debug workflow so iteration gets less painful

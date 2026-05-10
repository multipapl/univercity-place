# VR Integration Notes

This branch merges `vr-mode-modular` into the main `ThreeJS` repository without changing the normal desktop/web experience for users who do not have immersive WebXR support.

## Goal

- keep the current desktop viewer behavior as the default
- keep VR support available in the same app and on the same deployment URL
- avoid exposing VR-only runtime changes to normal desktop sessions

## Runtime behavior

- normal desktop browsers stay in the standard web pipeline
- VR-safe runtime config auto-enables only when immersive WebXR support is detected
- `?vr=1` still forces VR mode for explicit testing
- `?novr=1` still forces normal web mode

## Integration choices

- desktop render-scale and ambient-audio behavior from `dev` are preserved
- VR scene-loader filtering and safe-material options from `vr-mode-modular` are preserved
- VR startup defaults are no longer globally enabled in config
- the VR button is only created when WebXR immersive VR support is available

## Validation

- `npm test`
- `npm run build`

## Safety

- checkpoint commits were created on `dev`, `main`, and `vr-mode-modular` before merge work started
- integration work happens on a separate branch so stable branches remain intact

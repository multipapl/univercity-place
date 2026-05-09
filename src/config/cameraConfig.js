export const CAMERA_CONFIG = {
  fov: 75,
  height: 1.2,
  ambientMotion: {
    enabled: true,
    positionX: 0.014,
    positionY: 0.0245,
    positionZ: 0.0084,
    yawDegrees: 0.175,
    pitchDegrees: 0.126,
    speed: 0.364,
  },
};

export const LOCOMOTION_CONFIG = {
  mode: "walk",
  eyeHeight: 1.2,
  floorOffset: 0.02,
  collisionHeight: 1.75,
  collisionRadius: 0.2,
  collisionSkin: 0.02,
  collisionStepLength: 0.08,
  startPosition: { x: 0.8028, y: 0.50449, z: -0.54815 },
  startLookAt: null,
  startYawDegrees: 180,
  startPitchDegrees: 0,
  fixedFloorY: 0,
};

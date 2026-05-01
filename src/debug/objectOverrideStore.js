export const DEFAULT_OBJECT_OVERRIDE_VALUES = Object.freeze({
  hue: 0,
  saturation: 1,
  value: 1,
  gamma: 1,
});

export function createDefaultOverridesDocument() {
  return {
    version: 1,
    targets: [],
  };
}

function normalizeOverrideValue(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function normalizeTargetOverride(target = {}) {
  return {
    layerId: `${target.layerId ?? ""}`.trim(),
    meshName: `${target.meshName ?? ""}`.trim(),
    meshPath: `${target.meshPath ?? ""}`.trim(),
    materialName: `${target.materialName ?? ""}`.trim(),
    materialSlot: Number.isInteger(target.materialSlot) ? target.materialSlot : 0,
    hue: normalizeOverrideValue(target.hue, DEFAULT_OBJECT_OVERRIDE_VALUES.hue),
    saturation: normalizeOverrideValue(target.saturation, DEFAULT_OBJECT_OVERRIDE_VALUES.saturation),
    value: normalizeOverrideValue(target.value, DEFAULT_OBJECT_OVERRIDE_VALUES.value),
    gamma: normalizeOverrideValue(target.gamma, DEFAULT_OBJECT_OVERRIDE_VALUES.gamma),
  };
}

export function normalizeOverridesDocument(documentValue) {
  const nextDocument = createDefaultOverridesDocument();
  if (!documentValue || typeof documentValue !== "object") {
    return nextDocument;
  }

  if (Array.isArray(documentValue.targets)) {
    nextDocument.targets = documentValue.targets.map(normalizeTargetOverride);
  }

  if (Number.isFinite(documentValue.version)) {
    nextDocument.version = documentValue.version;
  }

  return nextDocument;
}

export function createTargetKey(target) {
  return [
    target.layerId,
    target.meshPath || target.meshName,
    target.materialName,
    `${target.materialSlot ?? 0}`,
  ].join("::");
}

export function isDefaultOverride(target) {
  return Math.abs(target.hue - DEFAULT_OBJECT_OVERRIDE_VALUES.hue) < 0.0001
    && Math.abs(target.saturation - DEFAULT_OBJECT_OVERRIDE_VALUES.saturation) < 0.0001
    && Math.abs(target.value - DEFAULT_OBJECT_OVERRIDE_VALUES.value) < 0.0001
    && Math.abs(target.gamma - DEFAULT_OBJECT_OVERRIDE_VALUES.gamma) < 0.0001;
}

export function createObjectOverrideStore(initialDocument = null) {
  let overridesDocument = normalizeOverridesDocument(initialDocument);

  function getDocument() {
    return overridesDocument;
  }

  function setDocument(documentValue) {
    overridesDocument = normalizeOverridesDocument(documentValue);
    return overridesDocument;
  }

  function getOverrideByKey(targetKey) {
    return overridesDocument.targets.find((target) => createTargetKey(target) === targetKey) ?? null;
  }

  function upsertOverride(targetOverride) {
    const nextTarget = normalizeTargetOverride(targetOverride);
    const nextKey = createTargetKey(nextTarget);
    const existingIndex = overridesDocument.targets.findIndex((target) => createTargetKey(target) === nextKey);

    if (isDefaultOverride(nextTarget)) {
      if (existingIndex >= 0) {
        overridesDocument.targets.splice(existingIndex, 1);
      }
      return null;
    }

    if (existingIndex >= 0) {
      overridesDocument.targets[existingIndex] = nextTarget;
      return nextTarget;
    }

    overridesDocument.targets.push(nextTarget);
    return nextTarget;
  }

  function resetOverride(target) {
    return upsertOverride({
      ...target,
      ...DEFAULT_OBJECT_OVERRIDE_VALUES,
    });
  }

  return {
    getDocument,
    getOverrideByKey,
    resetOverride,
    setDocument,
    upsertOverride,
  };
}

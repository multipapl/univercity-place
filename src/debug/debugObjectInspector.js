import * as THREE from "three";

const DEFAULT_OVERRIDE_VALUES = Object.freeze({
  hue: 0,
  saturation: 1,
  value: 1,
  gamma: 1,
});

function createDefaultOverridesDocument() {
  return {
    version: 1,
    targets: [],
  };
}

function normalizeOverrideValue(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeTargetOverride(target = {}) {
  return {
    layerId: `${target.layerId ?? ""}`.trim(),
    meshName: `${target.meshName ?? ""}`.trim(),
    materialName: `${target.materialName ?? ""}`.trim(),
    hue: normalizeOverrideValue(target.hue, DEFAULT_OVERRIDE_VALUES.hue),
    saturation: normalizeOverrideValue(target.saturation, DEFAULT_OVERRIDE_VALUES.saturation),
    value: normalizeOverrideValue(target.value, DEFAULT_OVERRIDE_VALUES.value),
    gamma: normalizeOverrideValue(target.gamma, DEFAULT_OVERRIDE_VALUES.gamma),
  };
}

function normalizeOverridesDocument(documentValue) {
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

function createTargetKey(target) {
  return [target.layerId, target.meshName, target.materialName].join("::");
}

function isDefaultOverride(target) {
  return Math.abs(target.hue - DEFAULT_OVERRIDE_VALUES.hue) < 0.0001
    && Math.abs(target.saturation - DEFAULT_OVERRIDE_VALUES.saturation) < 0.0001
    && Math.abs(target.value - DEFAULT_OVERRIDE_VALUES.value) < 0.0001
    && Math.abs(target.gamma - DEFAULT_OVERRIDE_VALUES.gamma) < 0.0001;
}

export function createDebugObjectInspector({
  enabled = false,
  isDev = false,
  assetQuery = "",
  camera,
  sceneRoots,
  rendererDomElement,
  materialPipeline,
  updateStatus,
  getMenuOpen,
  ui,
}) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hoverHelper = new THREE.BoxHelper(undefined, 0x93c5fd);
  hoverHelper.visible = false;
  hoverHelper.material.depthTest = false;
  hoverHelper.material.transparent = true;
  hoverHelper.material.opacity = 0.9;
  hoverHelper.userData.viewerDebugHelper = true;
  sceneRoots.add(hoverHelper);

  const state = {
    enabled,
    pickerArmed: false,
    hoveredMesh: null,
    loadedLayers: [],
    overridesDocument: createDefaultOverridesDocument(),
    selectedEntry: null,
    selectedTargetKey: "",
    hasLoadedOverrides: false,
  };

  function getOverridesUrl() {
    const suffix = assetQuery ? `?${assetQuery}` : "";
    return `/debug.scene-overrides.json${suffix}`;
  }

  function getMaterialEntries() {
    const entries = [];
    state.loadedLayers.forEach((entry) => {
      entry.root.traverse((child) => {
        if (!child.isMesh) {
          return;
        }

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (!material?.isMaterial) {
            return;
          }

          const target = materialPipeline.describeMaterialTarget(child, material);
          entries.push({
            layerEntry: entry,
            mesh: child,
            material,
            target,
            key: createTargetKey(target),
          });
        });
      });
    });

    return entries;
  }

  function findOverrideByKey(targetKey) {
    return state.overridesDocument.targets.find((target) => createTargetKey(target) === targetKey) ?? null;
  }

  function findMaterialEntryByKey(targetKey) {
    return getMaterialEntries().find((entry) => entry.key === targetKey) ?? null;
  }

  function getPointerIntersections(clientX, clientY) {
    const rect = rendererDomElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera(pointer, camera);

    return raycaster
      .intersectObject(sceneRoots, true)
      .filter((intersection) => (
        intersection.object?.isMesh
        && intersection.object.visible
        && !intersection.object.userData.viewerDebugHelper
      ));
  }

  function resolveSelectedEntry() {
    if (!state.selectedTargetKey) {
      state.selectedEntry = null;
      return null;
    }

    const nextEntry = findMaterialEntryByKey(state.selectedTargetKey) ?? state.selectedEntry;
    state.selectedEntry = nextEntry ?? null;
    return state.selectedEntry;
  }

  function setPickerArmed(nextValue) {
    state.pickerArmed = nextValue;
    if (ui.pickButton) {
      ui.pickButton.textContent = nextValue ? "Picking..." : "Pick Object";
    }

    if (!nextValue) {
      state.hoveredMesh = null;
      hoverHelper.visible = false;
    }
  }

  function setControlDisabled(disabled) {
    [
      ui.hueSlider,
      ui.saturationSlider,
      ui.valueSlider,
      ui.gammaSlider,
      ui.resetButton,
    ].forEach((element) => {
      if (element) {
        element.disabled = disabled;
      }
    });

    if (ui.copyButton) {
      ui.copyButton.disabled = false;
    }

    if (ui.saveButton) {
      ui.saveButton.disabled = !isDev;
    }
  }

  function updateSliderOutput(slider, output, formatter) {
    if (!slider || !output) {
      return;
    }

    output.value = formatter(Number(slider.value));
    output.textContent = formatter(Number(slider.value));
  }

  function setSelectionUi(entry) {
    const override = entry
      ? (findOverrideByKey(entry.key) ?? { ...entry.target, ...DEFAULT_OVERRIDE_VALUES })
      : { ...DEFAULT_OVERRIDE_VALUES };

    if (ui.selectionHint) {
      ui.selectionHint.textContent = entry
        ? (state.pickerArmed
            ? "Object selected. Click Pick Object again to choose another one."
            : "Object selected. Adjust values below or reset this target.")
        : "No object selected yet. Open the menu, click Pick Object, then click the scene.";
    }

    if (ui.selectionLayer) {
      ui.selectionLayer.textContent = entry?.target.layerId || "None";
    }

    if (ui.selectionMesh) {
      ui.selectionMesh.textContent = entry?.target.meshName || "None";
    }

    if (ui.selectionMaterial) {
      ui.selectionMaterial.textContent = entry?.target.materialName || "None";
    }

    if (ui.selectionSupport) {
      ui.selectionSupport.textContent = entry
        ? (materialPipeline.canApplyDebugColorCorrection(entry.material) ? "HSV + gamma ready" : "Shader override unavailable")
        : "No target";
    }

    if (ui.hueSlider) {
      ui.hueSlider.value = override.hue.toFixed(0);
    }

    if (ui.saturationSlider) {
      ui.saturationSlider.value = override.saturation.toFixed(2);
    }

    if (ui.valueSlider) {
      ui.valueSlider.value = override.value.toFixed(2);
    }

    if (ui.gammaSlider) {
      ui.gammaSlider.value = override.gamma.toFixed(2);
    }

    updateSliderOutput(ui.hueSlider, ui.hueValue, (value) => `${value.toFixed(0)}°`);
    updateSliderOutput(ui.saturationSlider, ui.saturationValue, (value) => value.toFixed(2));
    updateSliderOutput(ui.valueSlider, ui.valueValue, (value) => value.toFixed(2));
    updateSliderOutput(ui.gammaSlider, ui.gammaValue, (value) => value.toFixed(2));

    setControlDisabled(!entry);
    if (entry && !materialPipeline.canApplyDebugColorCorrection(entry.material)) {
      [
        ui.hueSlider,
        ui.saturationSlider,
        ui.valueSlider,
        ui.gammaSlider,
        ui.resetButton,
      ].forEach((element) => {
        if (element) {
          element.disabled = true;
        }
      });
    }
  }

  function updateSaveStatus(message) {
    if (ui.saveStatus) {
      ui.saveStatus.textContent = message;
    }
  }

  function applyOverridesToLoadedLayers() {
    const entries = getMaterialEntries();
    entries.forEach((entry) => {
      const override = findOverrideByKey(entry.key);
      if (override) {
        materialPipeline.applyDebugColorCorrection(entry.material, override);
      } else {
        materialPipeline.clearDebugColorCorrection(entry.material);
      }
    });

    setSelectionUi(resolveSelectedEntry());
  }

  function selectEntry(entry) {
    state.selectedEntry = entry ?? null;
    state.selectedTargetKey = entry?.key ?? "";
    setSelectionUi(state.selectedEntry);
  }

  function upsertOverride(targetOverride) {
    const nextTarget = normalizeTargetOverride(targetOverride);
    const nextKey = createTargetKey(nextTarget);
    const existingIndex = state.overridesDocument.targets.findIndex((target) => createTargetKey(target) === nextKey);

    if (isDefaultOverride(nextTarget)) {
      if (existingIndex >= 0) {
        state.overridesDocument.targets.splice(existingIndex, 1);
      }
      return;
    }

    if (existingIndex >= 0) {
      state.overridesDocument.targets[existingIndex] = nextTarget;
      return;
    }

    state.overridesDocument.targets.push(nextTarget);
  }

  function updateSelectedOverride(mutator) {
    const selectedEntry = resolveSelectedEntry();
    if (!selectedEntry || !materialPipeline.canApplyDebugColorCorrection(selectedEntry.material)) {
      return;
    }

    const currentOverride = normalizeTargetOverride(
      findOverrideByKey(selectedEntry.key)
      ?? { ...selectedEntry.target, ...DEFAULT_OVERRIDE_VALUES },
    );
    const nextOverride = normalizeTargetOverride(mutator({ ...currentOverride }));
    upsertOverride(nextOverride);
    applyOverridesToLoadedLayers();
  }

  async function copyOverrides() {
    const payload = `${JSON.stringify(state.overridesDocument, null, 2)}\n`;

    try {
      await navigator.clipboard.writeText(payload);
      updateSaveStatus("Overrides JSON copied to clipboard.");
      updateStatus("Overrides JSON copied to clipboard.");
    } catch {
      updateSaveStatus("Clipboard copy failed in this browser context.");
      updateStatus("Clipboard copy failed. Open the browser console if you need the JSON manually.");
      console.log(payload);
    }
  }

  async function saveOverrides() {
    if (!isDev) {
      updateSaveStatus("Save is available only in the local Vite dev server.");
      return;
    }

    try {
      const response = await fetch("/__debug/scene-overrides", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(state.overridesDocument),
      });

      if (!response.ok) {
        throw new Error(`Save request failed with ${response.status}.`);
      }

      updateSaveStatus("Overrides saved to public/debug.scene-overrides.json.");
      updateStatus("Overrides saved to public/debug.scene-overrides.json.");
    } catch (error) {
      console.error(error);
      updateSaveStatus("Save failed. Check the dev server console.");
      updateStatus("Override save failed. Check the dev server console.");
    }
  }

  function armPicker() {
    if (!state.enabled) {
      return;
    }

    setPickerArmed(true);
    updateStatus("Picker armed. Click an object in the scene while the debug menu is open.");
    setSelectionUi(resolveSelectedEntry());
  }

  function resetSelectedOverride() {
    const selectedEntry = resolveSelectedEntry();
    if (!selectedEntry) {
      return;
    }

    upsertOverride({ ...selectedEntry.target, ...DEFAULT_OVERRIDE_VALUES });
    applyOverridesToLoadedLayers();
    updateSaveStatus(`Reset override for ${selectedEntry.target.meshName || selectedEntry.target.layerId}.`);
  }

  function handleCanvasPointerDown(event) {
    if (!state.enabled || !state.pickerArmed || !getMenuOpen()) {
      return;
    }

    const intersections = getPointerIntersections(event.clientX, event.clientY);

    if (!intersections.length) {
      updateStatus("Picker missed. Click a visible mesh in the scene.");
      return;
    }

    const hit = intersections[0];
    const hitMaterials = Array.isArray(hit.object.material) ? hit.object.material : [hit.object.material];
    const materialIndex = Number.isInteger(hit.face?.materialIndex) ? hit.face.materialIndex : 0;
    const hitMaterial = hitMaterials[materialIndex] ?? hitMaterials[0];
    const target = materialPipeline.describeMaterialTarget(hit.object, hitMaterial);
    const selectedEntry = {
      layerEntry: null,
      mesh: hit.object,
      material: hitMaterial,
      target,
      key: createTargetKey(target),
    };

    selectEntry(selectedEntry);
    setPickerArmed(false);
    updateStatus(`Picked ${target.meshName || "(unnamed mesh)"} · ${target.materialName || "(unnamed material)"}.`);
  }

  function handleCanvasPointerMove(event) {
    if (!state.enabled || !state.pickerArmed || !getMenuOpen()) {
      if (state.hoveredMesh || hoverHelper.visible) {
        state.hoveredMesh = null;
        hoverHelper.visible = false;
      }
      return;
    }

    const intersections = getPointerIntersections(event.clientX, event.clientY);
    const hoveredMesh = intersections[0]?.object ?? null;
    if (!hoveredMesh) {
      state.hoveredMesh = null;
      hoverHelper.visible = false;
      return;
    }

    if (state.hoveredMesh !== hoveredMesh) {
      state.hoveredMesh = hoveredMesh;
      hoverHelper.setFromObject(hoveredMesh);
    } else {
      hoverHelper.update();
    }

    hoverHelper.visible = true;
  }

  async function loadOverrides() {
    if (!state.enabled) {
      return;
    }

    try {
      const response = await fetch(getOverridesUrl(), { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Override load failed with ${response.status}.`);
      }

      state.overridesDocument = normalizeOverridesDocument(await response.json());
      state.hasLoadedOverrides = true;
      applyOverridesToLoadedLayers();
      updateSaveStatus(`Loaded ${state.overridesDocument.targets.length} local override target(s).`);
    } catch (error) {
      console.warn("Debug override file could not be loaded.", error);
      state.overridesDocument = createDefaultOverridesDocument();
      state.hasLoadedOverrides = true;
      applyOverridesToLoadedLayers();
      updateSaveStatus("No local overrides file loaded yet. Save will create one.");
    }
  }

  function setLoadedLayers(loadedLayers = []) {
    state.loadedLayers = loadedLayers;
    resolveSelectedEntry();
    applyOverridesToLoadedLayers();
  }

  function bindUi() {
    ui.pickButton?.addEventListener("click", armPicker);
    ui.resetButton?.addEventListener("click", resetSelectedOverride);
    ui.copyButton?.addEventListener("click", copyOverrides);
    ui.saveButton?.addEventListener("click", saveOverrides);

    ui.hueSlider?.addEventListener("input", (event) => {
      updateSelectedOverride((override) => ({ ...override, hue: Number(event.target.value) }));
    });
    ui.saturationSlider?.addEventListener("input", (event) => {
      updateSelectedOverride((override) => ({ ...override, saturation: Number(event.target.value) }));
    });
    ui.valueSlider?.addEventListener("input", (event) => {
      updateSelectedOverride((override) => ({ ...override, value: Number(event.target.value) }));
    });
    ui.gammaSlider?.addEventListener("input", (event) => {
      updateSelectedOverride((override) => ({ ...override, gamma: Number(event.target.value) }));
    });

    rendererDomElement.addEventListener("pointerdown", handleCanvasPointerDown, true);
    rendererDomElement.addEventListener("pointermove", handleCanvasPointerMove, true);
    setSelectionUi(null);
    updateSaveStatus(isDev
      ? "Local overrides are ready. Save writes to public/debug.scene-overrides.json."
      : "Save-to-file is disabled outside the local Vite dev server.");
  }

  return {
    bindUi,
    loadOverrides,
    setLoadedLayers,
    setEnabled(nextEnabled) {
      state.enabled = Boolean(nextEnabled);
      if (!state.enabled) {
        setPickerArmed(false);
        state.hoveredMesh = null;
        hoverHelper.visible = false;
        return;
      }

      if (!state.hasLoadedOverrides) {
        loadOverrides();
        return;
      }

      applyOverridesToLoadedLayers();
    },
  };
}

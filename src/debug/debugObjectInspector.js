import { BoxHelper, Raycaster, Vector2 } from "three";
import {
  createDefaultOverridesDocument,
  createObjectOverrideStore,
  createTargetKey,
  DEFAULT_OBJECT_OVERRIDE_VALUES,
  normalizeOverridesDocument,
  normalizeTargetOverride,
} from "./objectOverrideStore.js";

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
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const hoverHelper = new BoxHelper(undefined, 0x93c5fd);
  hoverHelper.visible = false;
  hoverHelper.material.depthTest = false;
  hoverHelper.material.transparent = true;
  hoverHelper.material.opacity = 0.9;
  hoverHelper.userData.viewerDebugHelper = true;

  const state = {
    enabled,
    pickerArmed: false,
    hoveredMesh: null,
    loadedLayers: [],
    materialEntriesCache: null,
    overridesStore: createObjectOverrideStore(createDefaultOverridesDocument()),
    selectedEntry: null,
    selectedTargetKey: "",
    hasLoadedOverrides: false,
    uiCleanup: null,
  };

  function getOverridesUrl() {
    const suffix = assetQuery ? `?${assetQuery}` : "";
    return `/debug.scene-overrides.json${suffix}`;
  }

  function getMaterialEntries() {
    if (state.materialEntriesCache) {
      return state.materialEntriesCache;
    }

    const entries = [];
    state.loadedLayers.forEach((entry) => {
      entry.root.traverse((child) => {
        if (!child.isMesh) {
          return;
        }

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material, materialIndex) => {
          if (!material?.isMaterial) {
            return;
          }

          const target = materialPipeline.describeMaterialTarget(child, material, materialIndex);
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

    state.materialEntriesCache = entries;
    return state.materialEntriesCache;
  }

  function invalidateMaterialEntriesCache() {
    state.materialEntriesCache = null;
  }

  function findOverrideByKey(targetKey) {
    return state.overridesStore.getOverrideByKey(targetKey);
  }

  function findMaterialEntryByKey(targetKey) {
    return getMaterialEntries().find((entry) => entry.key === targetKey) ?? null;
  }

  function isSameMaterialEntry(left, right) {
    return Boolean(left && right)
      && left.mesh === right.mesh
      && left.material === right.material;
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

    const currentEntryStillLoaded = state.selectedEntry
      && getMaterialEntries().some((entry) => isSameMaterialEntry(entry, state.selectedEntry));
    const nextEntry = currentEntryStillLoaded
      ? state.selectedEntry
      : (findMaterialEntryByKey(state.selectedTargetKey) ?? state.selectedEntry);
    state.selectedEntry = nextEntry ?? null;
    return state.selectedEntry;
  }

  function setPickerArmed(nextValue) {
    state.pickerArmed = nextValue;
    if (nextValue) {
      if (!hoverHelper.parent) {
        sceneRoots.add(hoverHelper);
      }
    } else {
      hoverHelper.parent?.remove(hoverHelper);
    }

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
      ? (findOverrideByKey(entry.key) ?? { ...entry.target, ...DEFAULT_OBJECT_OVERRIDE_VALUES })
      : { ...DEFAULT_OBJECT_OVERRIDE_VALUES };

    if (ui.selectionHint) {
      ui.selectionHint.textContent = entry
        ? (state.pickerArmed
            ? "Pick another object."
            : "Object selected.")
        : "No object selected.";
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
    state.overridesStore.upsertOverride(targetOverride);
  }

  function updateSelectedOverride(mutator) {
    const selectedEntry = resolveSelectedEntry();
    if (!selectedEntry || !materialPipeline.canApplyDebugColorCorrection(selectedEntry.material)) {
      return;
    }

    const currentOverride = normalizeTargetOverride(
      findOverrideByKey(selectedEntry.key)
      ?? { ...selectedEntry.target, ...DEFAULT_OBJECT_OVERRIDE_VALUES },
    );
    const nextOverride = normalizeTargetOverride(mutator({ ...currentOverride }));
    upsertOverride(nextOverride);
    applyOverridesToLoadedLayers();
  }

  async function copyOverrides() {
    const payload = `${JSON.stringify(state.overridesStore.getDocument(), null, 2)}\n`;

    try {
      await navigator.clipboard.writeText(payload);
      updateSaveStatus("Overrides JSON copied to clipboard.");
      updateStatus("Overrides JSON copied to clipboard.");
    } catch {
      updateSaveStatus("Clipboard copy failed.");
      updateStatus("Clipboard copy failed.");
      console.log(payload);
    }
  }

  async function saveOverrides() {
    if (!isDev) {
      updateSaveStatus("Save works only in local dev.");
      return;
    }

    try {
      const response = await fetch("/__debug/scene-overrides", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(state.overridesStore.getDocument()),
      });

      if (!response.ok) {
        throw new Error(`Save request failed with ${response.status}.`);
      }

      updateSaveStatus("Overrides saved.");
      updateStatus("Overrides saved.");
    } catch (error) {
      console.error(error);
      updateSaveStatus("Save failed.");
      updateStatus("Save failed.");
    }
  }

  function armPicker() {
    if (!state.enabled) {
      return;
    }

    setPickerArmed(true);
    updateStatus("Pick an object in the scene.");
    setSelectionUi(resolveSelectedEntry());
  }

  function resetSelectedOverride() {
    const selectedEntry = resolveSelectedEntry();
    if (!selectedEntry) {
      return;
    }

    state.overridesStore.resetOverride(selectedEntry.target);
    applyOverridesToLoadedLayers();
    updateSaveStatus(`Reset override for ${selectedEntry.target.meshName || selectedEntry.target.layerId}.`);
  }

  function handleCanvasPointerDown(event) {
    if (!state.enabled || !state.pickerArmed || !getMenuOpen()) {
      return;
    }

    const intersections = getPointerIntersections(event.clientX, event.clientY);

    if (!intersections.length) {
      updateStatus("No object hit.");
      return;
    }

    const hit = intersections[0];
    const hitMaterials = Array.isArray(hit.object.material) ? hit.object.material : [hit.object.material];
    const materialIndex = Number.isInteger(hit.face?.materialIndex) ? hit.face.materialIndex : 0;
    const hitMaterial = hitMaterials[materialIndex] ?? hitMaterials[0];
    const target = materialPipeline.describeMaterialTarget(hit.object, hitMaterial, materialIndex);
    const selectedEntry = {
      layerEntry: null,
      mesh: hit.object,
      material: hitMaterial,
      target,
      key: createTargetKey(target),
    };

    selectEntry(selectedEntry);
    setPickerArmed(false);
    updateStatus(`Picked ${target.meshName || "mesh"}.`);
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

      state.overridesStore.setDocument(normalizeOverridesDocument(await response.json()));
      state.hasLoadedOverrides = true;
      applyOverridesToLoadedLayers();
      updateSaveStatus(`Loaded ${state.overridesStore.getDocument().targets.length} overrides.`);
    } catch (error) {
      console.warn("Debug override file could not be loaded.", error);
      state.overridesStore.setDocument(createDefaultOverridesDocument());
      state.hasLoadedOverrides = true;
      applyOverridesToLoadedLayers();
      updateSaveStatus("No saved overrides.");
    }
  }

  function setLoadedLayers(loadedLayers = []) {
    state.loadedLayers = loadedLayers;
    invalidateMaterialEntriesCache();
    resolveSelectedEntry();
    applyOverridesToLoadedLayers();
  }

  function bindUi() {
    state.uiCleanup?.();

    const cleanupCallbacks = [];
    const bind = (target, type, handler, options) => {
      target?.addEventListener(type, handler, options);
      cleanupCallbacks.push(() => {
        target?.removeEventListener(type, handler, options);
      });
    };

    const handleHueInput = (event) => {
      updateSelectedOverride((override) => ({ ...override, hue: Number(event.target.value) }));
    };
    const handleSaturationInput = (event) => {
      updateSelectedOverride((override) => ({ ...override, saturation: Number(event.target.value) }));
    };
    const handleValueInput = (event) => {
      updateSelectedOverride((override) => ({ ...override, value: Number(event.target.value) }));
    };
    const handleGammaInput = (event) => {
      updateSelectedOverride((override) => ({ ...override, gamma: Number(event.target.value) }));
    };

    bind(ui.pickButton, "click", armPicker);
    bind(ui.resetButton, "click", resetSelectedOverride);
    bind(ui.copyButton, "click", copyOverrides);
    bind(ui.saveButton, "click", saveOverrides);
    bind(ui.hueSlider, "input", handleHueInput);
    bind(ui.saturationSlider, "input", handleSaturationInput);
    bind(ui.valueSlider, "input", handleValueInput);
    bind(ui.gammaSlider, "input", handleGammaInput);
    bind(rendererDomElement, "pointerdown", handleCanvasPointerDown, true);
    bind(rendererDomElement, "pointermove", handleCanvasPointerMove, true);
    setSelectionUi(null);
    updateSaveStatus(isDev
      ? "Overrides ready."
      : "Save disabled outside local dev.");

    state.uiCleanup = () => {
      cleanupCallbacks.forEach((cleanup) => {
        cleanup();
      });
      cleanupCallbacks.length = 0;
      state.uiCleanup = null;
    };

    return state.uiCleanup;
  }

  return {
    bindUi,
    dispose() {
      state.uiCleanup?.();
      hoverHelper.visible = false;
      hoverHelper.parent?.remove(hoverHelper);
      hoverHelper.geometry?.dispose?.();
      hoverHelper.material?.dispose?.();
    },
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


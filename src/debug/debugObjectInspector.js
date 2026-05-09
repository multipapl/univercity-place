import { BoxHelper, Raycaster, Vector2 } from "three";
import {
  createDefaultOverridesDocument,
  createObjectOverrideStore,
  createTargetKey,
  DEFAULT_OBJECT_OVERRIDE_VALUES,
  normalizeOverridesDocument,
  normalizeTargetOverride,
} from "./objectOverrideStore.js";
import {
  AdditiveBlending,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
} from "three";

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
  onPickerArmedChange = null,
  requestRender = null,
  ui,
}) {
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const hoverHighlightMaterial = new MeshBasicMaterial({
    color: 0x60a5fa,
    transparent: true,
    opacity: 0.14,
    blending: AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
    side: DoubleSide,
    toneMapped: false,
  });

  const state = {
    enabled,
    pickerContextActive: false,
    pickerArmed: false,
    hoverHighlight: null,
    hoveredMesh: null,
    loadedLayers: [],
    materialEntriesCache: null,
    overridesStore: createObjectOverrideStore(createDefaultOverridesDocument()),
    selectedEntry: null,
    selectedTargetKey: "",
    hasLoadedOverrides: false,
    uiCleanup: null,
    saveTimeoutId: null,
    lastSavedSerialized: "",
  };

  function isExcludedLayerId(layerId) {
    return ["background", "sky", "collision", "glass", "windows"].includes(layerId);
  }

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
        && !isExcludedLayerId(intersection.object.userData?.viewerLayerId || "")
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

  function clearHoverHighlight() {
    if (!state.hoverHighlight) {
      return false;
    }

    state.hoverHighlight.parent?.remove(state.hoverHighlight);
    state.hoverHighlight = null;
    return true;
  }

  function createHoverHighlight(mesh) {
    if (!mesh?.geometry) {
      return null;
    }

    const highlight = mesh.isSkinnedMesh
      ? new mesh.constructor(mesh.geometry, hoverHighlightMaterial)
      : new Mesh(mesh.geometry, hoverHighlightMaterial);

    highlight.name = "ViewerDebugHoverHighlight";
    highlight.renderOrder = 9999;
    highlight.frustumCulled = false;
    highlight.userData.viewerDebugHelper = true;
    highlight.position.set(0, 0, 0);
    highlight.quaternion.identity();
    highlight.scale.set(1, 1, 1);

    if (mesh.isSkinnedMesh && mesh.skeleton) {
      highlight.bindMode = mesh.bindMode;
      highlight.bind(mesh.skeleton, mesh.bindMatrix);
      highlight.bindMatrix.copy(mesh.bindMatrix);
      highlight.bindMatrixInverse.copy(mesh.bindMatrixInverse);
    }

    if (Array.isArray(mesh.morphTargetInfluences)) {
      highlight.morphTargetDictionary = mesh.morphTargetDictionary;
      highlight.morphTargetInfluences = mesh.morphTargetInfluences;
    }

    return highlight;
  }

  function attachHoverHighlight(mesh) {
    clearHoverHighlight();
    const highlight = createHoverHighlight(mesh);
    if (!highlight) {
      return false;
    }

    mesh.add(highlight);
    state.hoverHighlight = highlight;
    return true;
  }

  function clearHoveredMeshState() {
    const hadHoveredMesh = Boolean(state.hoveredMesh);
    const didClearHighlight = clearHoverHighlight();
    state.hoveredMesh = null;
    return hadHoveredMesh || didClearHighlight;
  }

  function setPickerArmed(nextValue) {
    if (state.pickerArmed === nextValue) {
      return;
    }

    state.pickerArmed = nextValue;
    if (ui.pickButton) {
      ui.pickButton.textContent = nextValue ? "Picking..." : "Pick Object";
      ui.pickButton.setAttribute("aria-pressed", nextValue ? "true" : "false");
      ui.pickButton.classList.toggle("is-active", nextValue);
    }

    if (!nextValue) {
      clearHoveredMeshState();
    }

    onPickerArmedChange?.(nextValue);
    requestRender?.();
  }

  function setPickerContextActive(nextValue) {
    const normalizedNextValue = Boolean(nextValue);
    if (state.pickerContextActive === normalizedNextValue) {
      return;
    }

    state.pickerContextActive = normalizedNextValue;
    if (!normalizedNextValue) {
      setPickerArmed(false);
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
        : (state.pickerArmed ? "Pick an object in the scene." : "No object selected.");
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
        ? (isExcludedLayerId(entry.target.layerId)
            ? "Excluded for now"
            : (materialPipeline.canApplyDebugColorCorrection(entry.material) ? "HSV + gamma ready" : "Shader override unavailable"))
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
    if (entry && (isExcludedLayerId(entry.target.layerId) || !materialPipeline.canApplyDebugColorCorrection(entry.material))) {
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

  function getSerializedOverridesDocument() {
    return JSON.stringify(state.overridesStore.getDocument());
  }

  function applyOverridesToLoadedLayers() {
    const entries = getMaterialEntries();
    entries.forEach((entry) => {
      if (isExcludedLayerId(entry.target.layerId)) {
        return;
      }

      const override = findOverrideByKey(entry.key);
      if (override) {
        materialPipeline.applyDebugColorCorrection(entry.material, override);
      } else {
        materialPipeline.clearDebugColorCorrection(entry.material);
      }
    });

    setSelectionUi(resolveSelectedEntry());
    requestRender?.();
  }

  function selectEntry(entry) {
    state.selectedEntry = entry ?? null;
    state.selectedTargetKey = entry?.key ?? "";
    setSelectionUi(state.selectedEntry);
    requestRender?.();
  }

  function upsertOverride(targetOverride) {
    state.overridesStore.upsertOverride(targetOverride);
  }

  function scheduleOverridesSave() {
    if (!isDev || !state.hasLoadedOverrides) {
      return;
    }

    if (state.saveTimeoutId) {
      clearTimeout(state.saveTimeoutId);
    }

    state.saveTimeoutId = window.setTimeout(async () => {
      state.saveTimeoutId = null;
      const serialized = getSerializedOverridesDocument();
      if (serialized === state.lastSavedSerialized) {
        return;
      }

      await saveOverrides({ silent: true });
    }, 180);
  }

  function updateSelectedOverride(mutator) {
    const selectedEntry = resolveSelectedEntry();
    if (
      !selectedEntry
      || isExcludedLayerId(selectedEntry.target.layerId)
      || !materialPipeline.canApplyDebugColorCorrection(selectedEntry.material)
    ) {
      return;
    }

    const currentOverride = normalizeTargetOverride(
      findOverrideByKey(selectedEntry.key)
      ?? { ...selectedEntry.target, ...DEFAULT_OBJECT_OVERRIDE_VALUES },
    );
    const nextOverride = normalizeTargetOverride(mutator({ ...currentOverride }));
    upsertOverride(nextOverride);
    applyOverridesToLoadedLayers();
    scheduleOverridesSave();
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
    }
  }

  async function saveOverrides({ silent = false } = {}) {
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

      state.lastSavedSerialized = getSerializedOverridesDocument();
      updateSaveStatus(silent ? "Overrides autosaved." : "Overrides saved.");
      if (!silent) {
        updateStatus("Overrides saved.");
      }
    } catch (error) {
      console.error(error);
      updateSaveStatus(silent ? "Override autosave failed." : "Save failed.");
      if (!silent) {
        updateStatus("Save failed.");
      }
    }
  }

  function armPicker() {
    if (!state.enabled || !state.pickerContextActive) {
      return;
    }

    const nextPickerArmed = !state.pickerArmed;
    setPickerArmed(nextPickerArmed);
    updateStatus(nextPickerArmed ? "Pick an object in the scene." : "Object picking stopped.");
    setSelectionUi(resolveSelectedEntry());
    requestRender?.();
  }

  function resetSelectedOverride() {
    const selectedEntry = resolveSelectedEntry();
    if (!selectedEntry || isExcludedLayerId(selectedEntry.target.layerId)) {
      return;
    }

    state.overridesStore.resetOverride(selectedEntry.target);
    applyOverridesToLoadedLayers();
    updateSaveStatus(`Reset override for ${selectedEntry.target.meshName || selectedEntry.target.layerId}.`);
    scheduleOverridesSave();
  }

  function handleCanvasPointerDown(event) {
    if (!state.enabled || !state.pickerContextActive || !state.pickerArmed || !getMenuOpen()) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    const intersections = getPointerIntersections(event.clientX, event.clientY);

    if (!intersections.length) {
      updateStatus("No object hit.");
      requestRender?.();
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
    updateStatus(`Picked ${target.meshName || "mesh"}. Pick another object or press Pick Object to stop.`);
    requestRender?.();
  }

  function handleCanvasPointerMove(event) {
    if (!state.enabled || !state.pickerContextActive || !state.pickerArmed || !getMenuOpen()) {
      if (clearHoveredMeshState()) {
        requestRender?.();
      }
      return;
    }

    const intersections = getPointerIntersections(event.clientX, event.clientY);
    const hoveredMesh = intersections[0]?.object ?? null;
    if (!hoveredMesh) {
      if (clearHoveredMeshState()) {
        requestRender?.();
      }
      return;
    }

    if (state.hoveredMesh !== hoveredMesh || !state.hoverHighlight) {
      state.hoveredMesh = hoveredMesh;
      attachHoverHighlight(hoveredMesh);
      requestRender?.();
    }
  }

  function handleGlobalPointerMove(event) {
    if (!state.enabled || !state.pickerContextActive || !state.pickerArmed || !getMenuOpen()) {
      return;
    }

    if (event.target === rendererDomElement) {
      return;
    }

    if (clearHoveredMeshState()) {
      requestRender?.();
    }
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
      state.lastSavedSerialized = getSerializedOverridesDocument();
      applyOverridesToLoadedLayers();
      updateSaveStatus(`Loaded ${state.overridesStore.getDocument().targets.length} overrides.`);
    } catch (error) {
      console.warn("Debug override file could not be loaded.", error);
      state.overridesStore.setDocument(createDefaultOverridesDocument());
      state.hasLoadedOverrides = true;
      state.lastSavedSerialized = getSerializedOverridesDocument();
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
      clearHoveredMeshState();
      updateSelectedOverride((override) => ({ ...override, hue: Number(event.target.value) }));
    };
    const handleSaturationInput = (event) => {
      clearHoveredMeshState();
      updateSelectedOverride((override) => ({ ...override, saturation: Number(event.target.value) }));
    };
    const handleValueInput = (event) => {
      clearHoveredMeshState();
      updateSelectedOverride((override) => ({ ...override, value: Number(event.target.value) }));
    };
    const handleGammaInput = (event) => {
      clearHoveredMeshState();
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
    bind(window, "pointermove", handleGlobalPointerMove, true);
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
      if (state.saveTimeoutId) {
        clearTimeout(state.saveTimeoutId);
        state.saveTimeoutId = null;
      }
      state.uiCleanup?.();
      clearHoverHighlight();
      hoverHighlightMaterial.dispose();
    },
    isPickerArmed: () => state.pickerArmed,
    loadOverrides,
    setPickerContextActive,
    setLoadedLayers,
    setEnabled(nextEnabled) {
      state.enabled = Boolean(nextEnabled);
      if (!state.enabled) {
        setPickerArmed(false);
        clearHoveredMeshState();
        requestRender?.();
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


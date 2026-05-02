export function createDebugInspectorUi(refs) {
  return {
    pickButton: refs.pickObjectButton,
    resetButton: refs.resetObjectOverrideButton,
    copyButton: refs.copyObjectOverridesButton,
    saveButton: refs.saveObjectOverridesButton,
    selectionHint: refs.objectSelectionHint,
    selectionLayer: refs.selectedLayerId,
    selectionMesh: refs.selectedMeshName,
    selectionMaterial: refs.selectedMaterialName,
    selectionSupport: refs.selectedTargetSupport,
    hueSlider: refs.objectHueSlider,
    hueValue: refs.objectHueValue,
    saturationSlider: refs.objectSaturationSlider,
    saturationValue: refs.objectSaturationValue,
    valueSlider: refs.objectValueSlider,
    valueValue: refs.objectValueValue,
    gammaSlider: refs.objectGammaSlider,
    gammaValue: refs.objectGammaValue,
    saveStatus: refs.objectOverridesStatus,
  };
}

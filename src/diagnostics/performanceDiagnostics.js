export function createPerformanceDiagnostics({
  enabled = true,
  detailedStatsEnabled = false,
  renderer,
  diagnosticsState,
  runtimeOptimization,
  statsElements,
  getTextureDimensions,
}) {
  function formatInteger(value) {
    return new Intl.NumberFormat("en-US").format(Math.round(value || 0));
  }

  function formatMegabytes(bytes) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function collectMaterialTextures(material, target) {
    const textureKeys = [
      "map",
      "alphaMap",
      "roughnessMap",
      "emissiveMap",
      "metalnessMap",
      "normalMap",
    ];

    textureKeys.forEach((key) => {
      const texture = material?.[key];
      if (texture?.isTexture) {
        target.set(texture.id, texture);
      }
    });
  }

  function estimateTextureBytes(texture) {
    const image = texture?.image;
    if (!image) {
      return 0;
    }

    const { width, height } = getTextureDimensions(image);
    if (!width || !height) {
      return 0;
    }

    const mipFactor = texture.generateMipmaps ? (4 / 3) : 1;
    return width * height * 4 * mipFactor;
  }

  function estimateVisibleTextureMemory() {
    const uniqueTextures = new Map();

    diagnosticsState.loadedLayers.forEach((entry) => {
      if (!entry.root.visible) {
        return;
      }

      entry.root.traverse((child) => {
        if (!child.isMesh) {
          return;
        }

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => collectMaterialTextures(material, uniqueTextures));
      });
    });

    let textureBytes = 0;
    uniqueTextures.forEach((texture) => {
      textureBytes += estimateTextureBytes(texture);
    });

    return {
      count: uniqueTextures.size,
      bytes: textureBytes,
    };
  }

  function update() {
    if (!enabled) {
      return;
    }

    const renderInfo = renderer.info.render;
    const textureUsage = detailedStatsEnabled
      ? estimateVisibleTextureMemory()
      : null;

    if (statsElements.statFps) {
      statsElements.statFps.textContent = formatInteger(diagnosticsState.fps);
    }

    if (statsElements.statFrameMs) {
      statsElements.statFrameMs.textContent = `${diagnosticsState.frameMs.toFixed(1)} ms`;
    }

    if (statsElements.statDrawCalls) {
      statsElements.statDrawCalls.textContent = formatInteger(renderInfo.calls);
    }

    if (statsElements.statTriangles) {
      statsElements.statTriangles.textContent = formatInteger(renderInfo.triangles);
    }

    if (statsElements.statTextures) {
      statsElements.statTextures.textContent = textureUsage
        ? formatInteger(textureUsage.count)
        : "Debug only";
    }

    if (statsElements.statTextureMemory) {
      statsElements.statTextureMemory.textContent = textureUsage
        ? formatMegabytes(textureUsage.bytes)
        : "Debug only";
    }

    if (statsElements.performanceNote) {
      if (!detailedStatsEnabled) {
        statsElements.performanceNote.textContent = "Detailed texture stats and memory tuning are available in debug mode only.";
        return;
      }

      const visibleLayerLabels = diagnosticsState.loadedLayers
        .filter((entry) => entry.root.visible)
        .map((entry) => entry.layer.label);
      const deviceMemory = navigator.deviceMemory ? `${navigator.deviceMemory} GB reported RAM` : "device RAM unavailable";
      const mipMode = runtimeOptimization.lowMemoryBaseMipmaps
        ? "Base mipmaps disabled."
        : "Base mipmaps enabled.";
      const textureCap = runtimeOptimization.baseTextureMaxSize
        ? `Base textures capped to ${runtimeOptimization.baseTextureMaxSize}px.`
        : "Base textures uncapped.";
      statsElements.performanceNote.textContent = `Visible layers: ${visibleLayerLabels.join(", ") || "none"}. Texture VRAM is an approximation. ${mipMode} ${textureCap} ${deviceMemory}.`;
    }
  }

  return {
    update,
  };
}

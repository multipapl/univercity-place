export function createPerformanceDiagnostics({
  enabled = true,
  diagnosticsState,
  statsElements,
  getTextureDimensions,
  getHeavyStatsEnabled = () => true,
  getRendererInfo = null,
}) {
  function formatInteger(value) {
    return new Intl.NumberFormat("en-US").format(Math.round(value || 0));
  }

  function formatMegabytes(bytes) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getLightweightRendererStats() {
    const rendererInfo = getRendererInfo?.();
    return {
      drawCalls: rendererInfo?.render?.calls ?? 0,
      triangles: rendererInfo?.render?.triangles ?? 0,
      textureCount: rendererInfo?.memory?.textures ?? 0,
    };
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

  function estimateMeshDrawCalls(mesh) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    return Math.max(materials.filter((material) => material?.isMaterial).length, 1);
  }

  function estimateMeshTriangles(mesh) {
    const geometry = mesh.geometry;
    if (!geometry) {
      return 0;
    }

    if (geometry.index) {
      return geometry.index.count / 3;
    }

    const position = geometry.getAttribute?.("position");
    return position ? position.count / 3 : 0;
  }

  function estimateVisibleSceneComplexity() {
    const complexity = {
      drawCalls: 0,
      triangles: 0,
    };

    diagnosticsState.loadedLayers.forEach((entry) => {
      if (!entry.root.visible) {
        return;
      }

      entry.root.traverse((child) => {
        if (!child.isMesh || !child.visible) {
          return;
        }

        complexity.drawCalls += estimateMeshDrawCalls(child);
        complexity.triangles += estimateMeshTriangles(child);
      });
    });

    return complexity;
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
        if (!child.isMesh || !child.visible) {
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

    const heavyStatsEnabled = getHeavyStatsEnabled();
    const sceneComplexity = heavyStatsEnabled
      ? estimateVisibleSceneComplexity()
      : getLightweightRendererStats();
    const textureUsage = heavyStatsEnabled
      ? estimateVisibleTextureMemory()
      : {
          count: sceneComplexity.textureCount,
          bytes: null,
        };

    if (statsElements.statFps) {
      statsElements.statFps.textContent = formatInteger(diagnosticsState.fps);
    }

    if (statsElements.quickFpsValue) {
      statsElements.quickFpsValue.textContent = formatInteger(diagnosticsState.fps);
    }

    if (statsElements.bottomQuickFpsValue) {
      statsElements.bottomQuickFpsValue.textContent = formatInteger(diagnosticsState.fps);
    }

    if (statsElements.statFrameMs) {
      statsElements.statFrameMs.textContent = `${diagnosticsState.frameMs.toFixed(1)} ms`;
    }

    if (statsElements.statDrawCalls) {
      statsElements.statDrawCalls.textContent = formatInteger(sceneComplexity.drawCalls);
    }

    if (statsElements.statTriangles) {
      statsElements.statTriangles.textContent = formatInteger(sceneComplexity.triangles);
    }

    if (statsElements.statTextures) {
      statsElements.statTextures.textContent = formatInteger(textureUsage.count);
    }

    if (statsElements.statTextureMemory) {
      statsElements.statTextureMemory.textContent = textureUsage.bytes === null
        ? "n/a"
        : formatMegabytes(textureUsage.bytes);
    }
  }

  return {
    update,
  };
}

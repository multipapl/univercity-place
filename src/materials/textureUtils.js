import {
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  SRGBColorSpace
} from "three";

export function createTextureUtils({
  viewerConfig,
  maxSupportedAnisotropy,
}) {
  function normalizeTexture(texture) {
    if (!texture) {
      return texture;
    }

    texture.colorSpace = SRGBColorSpace;
    texture.flipY = false;
    texture.needsUpdate = true;

    return texture;
  }

  function normalizeDataTexture(texture) {
    if (!texture) {
      return texture;
    }

    texture.colorSpace = NoColorSpace;
    texture.flipY = false;
    texture.needsUpdate = true;

    return texture;
  }

  function tuneFoliageTexture(texture) {
    if (!texture) {
      return texture;
    }

    if (viewerConfig.materialPresets.foliageDisableMipmaps) {
      texture.generateMipmaps = false;
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
    } else {
      texture.generateMipmaps = true;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.magFilter = LinearFilter;
    }

    texture.anisotropy = Math.min(
      viewerConfig.materialPresets.foliageAnisotropy ?? 1,
      maxSupportedAnisotropy || 1,
    );

    if (viewerConfig.materialPresets.foliagePremultiplyAlpha) {
      texture.premultiplyAlpha = true;
    }

    texture.needsUpdate = true;
    return texture;
  }

  function getTextureDimensions(image) {
    if (!image) {
      return { width: 0, height: 0 };
    }

    return {
      width: image.videoWidth || image.naturalWidth || image.width || 0,
      height: image.videoHeight || image.naturalHeight || image.height || 0,
    };
  }

  function applyTextureSizeCap(texture, maxSize = 0) {
    if (!texture) {
      return texture;
    }

    const textureUserData = texture.userData;
    const sourceImage = textureUserData.viewerOriginalImage || texture.image;
    if (!sourceImage) {
      return texture;
    }

    if (!textureUserData.viewerOriginalImage) {
      textureUserData.viewerOriginalImage = sourceImage;
    }

    const { width, height } = getTextureDimensions(sourceImage);
    if (!width || !height) {
      return texture;
    }

    if (!maxSize || Math.max(width, height) <= maxSize) {
      if (texture.image !== sourceImage) {
        texture.image = sourceImage;
        texture.needsUpdate = true;
      }
      return texture;
    }

    const scale = maxSize / Math.max(width, height);
    const nextWidth = Math.max(1, Math.round(width * scale));
    const nextHeight = Math.max(1, Math.round(height * scale));
    const cappedCanvas = textureUserData.viewerCappedCanvas || document.createElement("canvas");
    const cappedContext = textureUserData.viewerCappedContext || cappedCanvas.getContext("2d");
    if (!cappedContext) {
      return texture;
    }

    textureUserData.viewerCappedCanvas = cappedCanvas;
    textureUserData.viewerCappedContext = cappedContext;

    const currentImage = texture.image;
    const currentDimensions = getTextureDimensions(currentImage);
    if (currentImage
      && currentImage === cappedCanvas
      && currentDimensions.width === nextWidth
      && currentDimensions.height === nextHeight) {
      return texture;
    }

    cappedCanvas.width = nextWidth;
    cappedCanvas.height = nextHeight;
    cappedContext.clearRect(0, 0, nextWidth, nextHeight);
    cappedContext.drawImage(sourceImage, 0, 0, nextWidth, nextHeight);
    texture.image = cappedCanvas;
    texture.needsUpdate = true;
    return texture;
  }

  function tuneBakedTexture(texture) {
    if (!texture) {
      return texture;
    }

    applyTextureSizeCap(texture, viewerConfig.runtimeOptimization.baseTextureMaxSize);

    if (viewerConfig.runtimeOptimization.lowMemoryBaseMipmaps) {
      texture.generateMipmaps = false;
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
    } else {
      texture.generateMipmaps = true;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.magFilter = LinearFilter;
    }

    texture.needsUpdate = true;
    return texture;
  }

  function applyTextureChannelOverride(texture, fallbackChannel) {
    if (!texture || !Number.isInteger(fallbackChannel) || fallbackChannel < 0) {
      return texture;
    }

    texture.channel = fallbackChannel;
    texture.needsUpdate = true;

    return texture;
  }

  return {
    applyTextureChannelOverride,
    getTextureDimensions,
    normalizeDataTexture,
    normalizeTexture,
    tuneBakedTexture,
    tuneFoliageTexture,
  };
}

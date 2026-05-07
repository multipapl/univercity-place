const EXPECTED_CONTENT_TYPES = {
  jpg: "image/",
  mp4: "video/",
};

async function probeNumberedFiles(baseUrl, prefix, extension, padLength, maxCount = 50) {
  const urls = [];
  const expectedType = EXPECTED_CONTENT_TYPES[extension] || "";
  for (let i = 1; i <= maxCount; i++) {
    const num = String(i).padStart(padLength, "0");
    const url = `${baseUrl}/${prefix}${num}.${extension}`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (!res.ok) break;
      const contentType = res.headers.get("content-type") || "";
      if (expectedType && !contentType.startsWith(expectedType)) break;
      urls.push(url);
    } catch {
      break;
    }
  }
  return urls;
}

async function discoverGalleryItems(rendersBaseUrl) {
  const [stillUrls, videoUrls] = await Promise.all([
    probeNumberedFiles(`${rendersBaseUrl}/stills`, "up_still_", "jpg", 3),
    probeNumberedFiles(`${rendersBaseUrl}/animation`, "up_animation_", "mp4", 2),
  ]);

  return [
    ...stillUrls.map((url) => ({ type: "image", url })),
    ...videoUrls.map((url) => ({ type: "video", url })),
  ];
}

export function createGalleryOverlay({ overlay, rendersBaseUrl }) {
  const counter = overlay.querySelector("[data-gallery-counter]");
  const stage = overlay.querySelector("[data-gallery-stage]");
  const prevBtn = overlay.querySelector("[data-gallery-prev]");
  const nextBtn = overlay.querySelector("[data-gallery-next]");
  const closeBtn = overlay.querySelector("[data-gallery-close]");

  let items = null;
  let currentIndex = 0;
  let isOpen = false;
  let onCloseCallback = null;

  function updateCounter() {
    if (!counter) return;
    counter.textContent = items?.length
      ? `${currentIndex + 1} / ${items.length}`
      : "";
  }

  function updateNavButtons() {
    if (prevBtn) prevBtn.disabled = currentIndex <= 0;
    if (nextBtn) nextBtn.disabled = !items || currentIndex >= items.length - 1;
  }

  function preloadAdjacent(index) {
    for (const offset of [-1, 1]) {
      const adj = index + offset;
      if (adj < 0 || adj >= items.length) continue;
      const item = items[adj];
      if (item.type === "image" && !item._preloaded) {
        const img = new Image();
        img.src = item.url;
        item._preloaded = true;
      }
    }
  }

  function attemptVideoAutoplay(video) {
    if (!video) {
      return;
    }

    const playPromise = video.play?.();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        // Some browsers can still reject autoplay; keep controls visible for manual resume.
      });
    }
  }

  function createMediaElement(item, index) {
    if (item.type === "image") {
      const img = document.createElement("img");
      img.className = "gallery-media";
      img.src = item.url;
      img.alt = `Render ${index + 1}`;
      img.draggable = false;
      return img;
    }

    const video = document.createElement("video");
    video.className = "gallery-media";
    video.src = item.url;
    video.autoplay = true;
    video.controls = true;
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("autoplay", "");
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.playsInline = true;
    video.preload = "metadata";
    video.addEventListener("loadeddata", () => {
      attemptVideoAutoplay(video);
    }, { once: true });
    return video;
  }

  function swapStageContent(item, index) {
    const oldVideo = stage.querySelector("video");
    if (oldVideo) oldVideo.pause();
    stage.innerHTML = "";
    const mediaElement = createMediaElement(item, index);
    stage.appendChild(mediaElement);

    if (item.type === "video") {
      attemptVideoAutoplay(mediaElement);
    }
  }

  function showItem(index) {
    if (!items?.length || index < 0 || index >= items.length) return;

    currentIndex = index;
    const item = items[index];
    const hasExistingMedia = Boolean(stage.querySelector(".gallery-media"));

    if (hasExistingMedia) {
      stage.classList.add("is-transitioning");
      setTimeout(() => {
        swapStageContent(item, index);
        stage.classList.remove("is-transitioning");
      }, 180);
    } else {
      swapStageContent(item, index);
    }

    updateCounter();
    updateNavButtons();
    preloadAdjacent(index);
  }

  function goNext() {
    if (items && currentIndex < items.length - 1) showItem(currentIndex + 1);
  }

  function goPrev() {
    if (items && currentIndex > 0) showItem(currentIndex - 1);
  }

  function handleKeyDown(event) {
    if (!isOpen) return;

    if (event.code === "ArrowRight") {
      event.preventDefault();
      goNext();
    } else if (event.code === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    }
  }

  let touchStartX = 0;
  let touchStartY = 0;

  function handleTouchStart(event) {
    if (!isOpen) return;
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }

  function handleTouchEnd(event) {
    if (!isOpen) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.hidden = true;

    const video = stage.querySelector("video");
    if (video) video.pause();

    onCloseCallback?.();
  }

  async function open() {
    if (isOpen) return;
    isOpen = true;
    overlay.hidden = false;

    if (items === null) {
      stage.innerHTML = '<p class="gallery-status-text">Loading gallery...</p>';
      updateCounter();
      updateNavButtons();
      items = await discoverGalleryItems(rendersBaseUrl);
    }

    if (items.length === 0) {
      stage.innerHTML = '<p class="gallery-status-text">No renders available.</p>';
      updateCounter();
      updateNavButtons();
      return;
    }

    showItem(0);
  }

  function handleOverlayClick(event) {
    if (event.target === overlay) close();
  }

  prevBtn?.addEventListener("click", goPrev);
  nextBtn?.addEventListener("click", goNext);
  closeBtn?.addEventListener("click", close);
  overlay.addEventListener("click", handleOverlayClick);
  window.addEventListener("keydown", handleKeyDown);
  stage?.addEventListener("touchstart", handleTouchStart, { passive: true });
  stage?.addEventListener("touchend", handleTouchEnd, { passive: true });

  return {
    open,
    close,
    isOpen: () => isOpen,
    setOnClose(callback) {
      onCloseCallback = callback;
    },
    dispose() {
      prevBtn?.removeEventListener("click", goPrev);
      nextBtn?.removeEventListener("click", goNext);
      closeBtn?.removeEventListener("click", close);
      overlay.removeEventListener("click", handleOverlayClick);
      window.removeEventListener("keydown", handleKeyDown);
      stage?.removeEventListener("touchstart", handleTouchStart);
      stage?.removeEventListener("touchend", handleTouchEnd);
    },
  };
}

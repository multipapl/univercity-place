function clampVolume(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

export function createAmbientAudioController({
  src,
  initialVolume = 0.06,
  fadeInDurationMs = 10000,
  loop = true,
  createAudioElement = () => new Audio(),
  interactionTarget = window,
  visibilityTarget = document,
  requestFrame = window.requestAnimationFrame.bind(window),
  cancelFrame = window.cancelAnimationFrame.bind(window),
} = {}) {
  if (!src) {
    throw new Error("Ambient audio source URL is required.");
  }

  const audio = createAudioElement();
  let disposed = false;
  let started = false;
  let playing = false;
  let waitingForInteraction = false;
  let interactionAbortController = null;
  let fadeFrameId = null;
  let fadeStartTime = null;
  let currentVolume = 0;
  let targetVolume = clampVolume(initialVolume);

  audio.src = src;
  audio.autoplay = true;
  audio.loop = loop;
  audio.preload = "auto";
  audio.playsInline = true;
  audio.volume = 0;
  audio.setAttribute?.("autoplay", "");
  audio.setAttribute?.("playsinline", "");

  function syncVolume() {
    audio.volume = clampVolume(currentVolume);
  }

  function stopFade() {
    if (fadeFrameId !== null) {
      cancelFrame(fadeFrameId);
      fadeFrameId = null;
    }

    fadeStartTime = null;
  }

  function stepFade(timestamp) {
    if (disposed || !playing) {
      fadeFrameId = null;
      return;
    }

    if (fadeStartTime === null) {
      fadeStartTime = timestamp;
    }

    if (fadeInDurationMs <= 0) {
      currentVolume = targetVolume;
      syncVolume();
      fadeFrameId = null;
      fadeStartTime = null;
      return;
    }

    const progress = Math.min(1, (timestamp - fadeStartTime) / fadeInDurationMs);
    currentVolume = targetVolume * progress;
    syncVolume();

    if (progress >= 1) {
      fadeFrameId = null;
      fadeStartTime = null;
      return;
    }

    fadeFrameId = requestFrame(stepFade);
  }

  function startFade() {
    stopFade();
    currentVolume = 0;
    syncVolume();
    fadeFrameId = requestFrame(stepFade);
  }

  function removeInteractionRetry() {
    if (interactionAbortController) {
      interactionAbortController.abort();
      interactionAbortController = null;
    }

    waitingForInteraction = false;
  }

  function registerInteractionRetry() {
    if (waitingForInteraction || disposed || !interactionTarget?.addEventListener) {
      return;
    }

    waitingForInteraction = true;
    interactionAbortController = typeof AbortController === "function"
      ? new AbortController()
      : null;
    const options = {
      once: true,
      passive: true,
      signal: interactionAbortController?.signal,
    };

    const handleInteraction = () => {
      removeInteractionRetry();
      void ensurePlayback();
    };

    ["pointerdown", "pointerup", "click", "keydown", "keyup", "touchstart", "mousedown", "focus"].forEach((eventName) => {
      interactionTarget.addEventListener(eventName, handleInteraction, options);
    });
  }

  async function ensurePlayback() {
    if (disposed || !started || visibilityTarget?.hidden) {
      return false;
    }

    try {
      await audio.play();
      removeInteractionRetry();

      if (!playing) {
        playing = true;
        startFade();
      }

      return true;
    } catch {
      registerInteractionRetry();
      return false;
    }
  }

  function setVolume(nextVolume) {
    targetVolume = clampVolume(nextVolume);

    if (!playing) {
      return;
    }

    if (fadeFrameId !== null) {
      return;
    }

    currentVolume = targetVolume;
    syncVolume();
  }

  function handleVisibilityChange() {
    if (disposed) {
      return;
    }

    if (visibilityTarget?.hidden) {
      audio.pause?.();
      return;
    }

    if (!started) {
      return;
    }

    void ensurePlayback();
  }

  function handleAudioPause() {
    if (disposed || !started || visibilityTarget?.hidden) {
      return;
    }

    void ensurePlayback();
  }

  visibilityTarget?.addEventListener?.("visibilitychange", handleVisibilityChange);
  audio.addEventListener?.("pause", handleAudioPause);

  function start() {
    if (disposed || started) {
      return;
    }

    started = true;
    void ensurePlayback();
  }

  function dispose() {
    if (disposed) {
      return;
    }

    disposed = true;
    stopFade();
    removeInteractionRetry();
    visibilityTarget?.removeEventListener?.("visibilitychange", handleVisibilityChange);
    audio.removeEventListener?.("pause", handleAudioPause);
    audio.pause?.();
    audio.removeAttribute?.("src");
    audio.load?.();
  }

  return {
    start,
    setVolume,
    dispose,
    getVolume: () => targetVolume,
    getAudioElement: () => audio,
    isWaitingForInteraction: () => waitingForInteraction,
    isPlaying: () => playing,
    onVisibilityChange: handleVisibilityChange,
    _test: {
      stepFade,
      stopFade,
    },
  };
}

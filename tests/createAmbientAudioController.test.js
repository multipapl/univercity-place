import test from "node:test";
import assert from "node:assert/strict";

import { createAmbientAudioController } from "../src/audio/createAmbientAudioController.js";

function createFrameScheduler() {
  let nextId = 1;
  const callbacks = new Map();

  return {
    requestFrame(callback) {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    cancelFrame(id) {
      callbacks.delete(id);
    },
    runNextFrame(timestamp) {
      const entry = callbacks.entries().next();
      if (entry.done) {
        throw new Error("No frame scheduled.");
      }

      const [id, callback] = entry.value;
      callbacks.delete(id);
      callback(timestamp);
    },
  };
}

function createFakeAudio({ playImpl } = {}) {
  return {
    src: "",
    loop: false,
    preload: "",
    playsInline: false,
    volume: 1,
    paused: true,
    playCalls: 0,
    pauseCalls: 0,
    async play() {
      this.playCalls += 1;
      return playImpl ? playImpl.call(this) : undefined;
    },
    pause() {
      this.paused = true;
      this.pauseCalls += 1;
    },
    removeAttribute(name) {
      if (name === "src") {
        this.src = "";
      }
    },
    load() {
      this.loaded = true;
    },
  };
}

test("ambient audio fades into the configured target volume", async () => {
  const frames = createFrameScheduler();
  const audio = createFakeAudio({
    playImpl() {
      this.paused = false;
    },
  });

  const controller = createAmbientAudioController({
    src: "/assets/audio/test.mp3",
    initialVolume: 0.06,
    fadeInDurationMs: 10000,
    createAudioElement: () => audio,
    interactionTarget: new EventTarget(),
    visibilityTarget: new EventTarget(),
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
  });

  controller.start();
  await Promise.resolve();

  frames.runNextFrame(0);
  assert.equal(audio.volume, 0);

  frames.runNextFrame(5000);
  assert.equal(audio.volume, 0.03);

  frames.runNextFrame(10000);
  assert.equal(audio.volume, 0.06);
  assert.equal(audio.loop, true);
  assert.equal(audio.playCalls, 1);
});

test("ambient audio retries after autoplay is blocked", async () => {
  const frames = createFrameScheduler();
  const interactionTarget = new EventTarget();
  const visibilityTarget = new EventTarget();
  let allowPlayback = false;
  const audio = createFakeAudio({
    playImpl() {
      if (!allowPlayback) {
        throw new Error("Autoplay blocked");
      }

      this.paused = false;
    },
  });

  const controller = createAmbientAudioController({
    src: "/assets/audio/test.mp3",
    createAudioElement: () => audio,
    interactionTarget,
    visibilityTarget,
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
  });

  controller.start();
  await Promise.resolve();

  assert.equal(controller.isWaitingForInteraction(), true);
  assert.equal(controller.isPlaying(), false);

  allowPlayback = true;
  interactionTarget.dispatchEvent(new Event("pointerdown"));
  await Promise.resolve();

  assert.equal(controller.isWaitingForInteraction(), false);
  assert.equal(controller.isPlaying(), true);
  assert.equal(audio.playCalls, 2);
});

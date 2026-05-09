import test from "node:test";
import assert from "node:assert/strict";

import { discoverGalleryItems } from "../src/ui/galleryOverlay.js";

test("discoverGalleryItems keeps probing sequential renders without HEAD requests", async () => {
  const seenUrls = [];
  const probe = async (url, mediaType) => {
    seenUrls.push({ url, mediaType });
    return [
      "https://cdn.example.com/assets/renders/stills/up_still_001.jpg",
      "https://cdn.example.com/assets/renders/stills/up_still_002.jpg",
      "https://cdn.example.com/assets/renders/animation/up_animation_01.mp4",
    ].includes(url);
  };

  const items = await discoverGalleryItems("https://cdn.example.com/assets/renders", probe);

  assert.deepEqual(items, [
    {
      type: "image",
      url: "https://cdn.example.com/assets/renders/stills/up_still_001.jpg",
    },
    {
      type: "image",
      url: "https://cdn.example.com/assets/renders/stills/up_still_002.jpg",
    },
    {
      type: "video",
      url: "https://cdn.example.com/assets/renders/animation/up_animation_01.mp4",
    },
  ]);
  assert.deepEqual(seenUrls, [
    {
      url: "https://cdn.example.com/assets/renders/stills/up_still_001.jpg",
      mediaType: "image",
    },
    {
      url: "https://cdn.example.com/assets/renders/animation/up_animation_01.mp4",
      mediaType: "video",
    },
    {
      url: "https://cdn.example.com/assets/renders/stills/up_still_002.jpg",
      mediaType: "image",
    },
    {
      url: "https://cdn.example.com/assets/renders/animation/up_animation_02.mp4",
      mediaType: "video",
    },
    {
      url: "https://cdn.example.com/assets/renders/stills/up_still_003.jpg",
      mediaType: "image",
    },
  ]);
});

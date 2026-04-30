export async function findFirstReachableAsset(candidates = []) {
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { method: "HEAD" });
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      const looksLikeHtmlFallback = contentType.includes("text/html");
      if (response.ok && !looksLikeHtmlFallback) {
        return candidate;
      }
    } catch (error) {
      console.warn(`Scene probe failed for ${candidate}.`, error);
    }
  }

  return null;
}

export async function resolveOptionalAssetUrl(searchParams, searchParam, candidates = []) {
  const directUrl = searchParams.get(searchParam);
  if (directUrl) {
    return directUrl;
  }

  return findFirstReachableAsset(candidates);
}

export async function resolveSceneLayers(sceneLayers, searchParams) {
  const resolvedLayers = [];

  for (const layer of sceneLayers) {
    const directUrl = searchParams.get(layer.searchParam ?? layer.id);
    const url = directUrl || await findFirstReachableAsset(layer.candidates);
    if (!url) {
      if (layer.required) {
        return null;
      }
      continue;
    }

    resolvedLayers.push({
      ...layer,
      url,
    });
  }

  return resolvedLayers;
}

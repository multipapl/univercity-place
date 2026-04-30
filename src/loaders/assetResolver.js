export function appendAssetQuery(url, assetQuery = "") {
  if (!assetQuery) {
    return url;
  }

  const [urlWithoutHash, hashFragment = ""] = url.split("#", 2);
  if (
    urlWithoutHash.includes(`?${assetQuery}`)
    || urlWithoutHash.includes(`&${assetQuery}`)
  ) {
    return url;
  }

  const separator = urlWithoutHash.includes("?") ? "&" : "?";
  return `${urlWithoutHash}${separator}${assetQuery}${hashFragment ? `#${hashFragment}` : ""}`;
}

export async function findFirstReachableAsset(candidates = [], assetQuery = "") {
  for (const candidate of candidates) {
    const candidateUrl = appendAssetQuery(candidate, assetQuery);
    try {
      const response = await fetch(candidateUrl, { method: "HEAD", cache: "no-store" });
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      const looksLikeHtmlFallback = contentType.includes("text/html");
      if (response.ok && !looksLikeHtmlFallback) {
        return candidateUrl;
      }
    } catch (error) {
      console.warn(`Scene probe failed for ${candidateUrl}.`, error);
    }
  }

  return null;
}

export async function resolveOptionalAssetUrl(searchParams, searchParam, candidates = [], assetQuery = "") {
  const directUrl = searchParams.get(searchParam);
  if (directUrl) {
    return appendAssetQuery(directUrl, assetQuery);
  }

  return findFirstReachableAsset(candidates, assetQuery);
}

export async function resolveSceneLayers(sceneLayers, searchParams, assetQuery = "") {
  const resolvedLayers = [];

  for (const layer of sceneLayers) {
    const directUrl = searchParams.get(layer.searchParam ?? layer.id);
    const url = directUrl
      ? appendAssetQuery(directUrl, assetQuery)
      : await findFirstReachableAsset(layer.candidates, assetQuery);
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

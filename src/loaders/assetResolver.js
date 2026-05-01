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

export function resolveOptionalAssetUrl(searchParams, searchParam, expectedUrl = "", assetQuery = "") {
  const directUrl = searchParams.get(searchParam);
  if (directUrl) {
    return appendAssetQuery(directUrl, assetQuery);
  }

  return expectedUrl ? appendAssetQuery(expectedUrl, assetQuery) : null;
}

export function resolveSceneLayers(sceneLayers, searchParams, assetQuery = "") {
  return sceneLayers.map((layer) => ({
    ...layer,
    url: resolveOptionalAssetUrl(
      searchParams,
      layer.searchParam ?? layer.id,
      layer.url,
      assetQuery,
    ),
  }));
}

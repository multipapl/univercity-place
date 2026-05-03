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

export function resolveAssetContract(assetContract, searchParams, assetQuery = "") {
  return {
    ...assetContract,
    url: resolveOptionalAssetUrl(
      searchParams,
      assetContract.searchParam ?? assetContract.id,
      assetContract.url,
      assetQuery,
    ),
  };
}

export function resolveSceneLayers(sceneLayers, searchParams, assetQuery = "") {
  return sceneLayers.map((layer) => resolveAssetContract(layer, searchParams, assetQuery));
}

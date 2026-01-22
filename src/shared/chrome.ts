type BrowserApi = {
  management?: chrome.management.Static;
  runtime?: { getURL?: (path: string) => string; id?: string };
};

const getBrowserApi = (): BrowserApi | null => {
  const maybeBrowser = (globalThis as unknown as { browser?: BrowserApi }).browser;
  if (maybeBrowser?.management || maybeBrowser?.runtime) {
    return maybeBrowser;
  }
  return null;
};

export const getManagement = () => {
  if (typeof chrome !== "undefined" && chrome.management) {
    return chrome.management;
  }
  const browserApi = getBrowserApi();
  if (browserApi?.management) {
    return browserApi.management;
  }
  return null;
};

export const getRuntimeUrl = (path: string) => {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }
  const browserApi = getBrowserApi();
  if (browserApi?.runtime?.getURL) {
    return browserApi.runtime.getURL(path);
  }
  return path;
};

export const getRuntimeId = () => {
  if (typeof chrome !== "undefined" && chrome.runtime?.id) {
    return chrome.runtime.id;
  }
  const browserApi = getBrowserApi();
  if (browserApi?.runtime?.id) {
    return browserApi.runtime.id;
  }
  return null;
};

export const getRuntimeOrigin = () => {
  try {
    const url = new URL(getRuntimeUrl(""));
    if (url.origin === "null" && url.protocol && url.host) {
      return `${url.protocol}//${url.host}`;
    }
    return url.origin;
  } catch {
    return null;
  }
};

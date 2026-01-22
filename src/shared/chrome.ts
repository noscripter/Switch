type BrowserApi = {
  management?: chrome.management.Static;
  runtime?: { getURL?: (path: string) => string };
};

const getBrowserApi = (): BrowserApi | null => {
  if (typeof globalThis === "undefined") {
    return null;
  }
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

export const getRuntimeOrigin = () => {
  try {
    return new URL(getRuntimeUrl("")).origin;
  } catch {
    return null;
  }
};

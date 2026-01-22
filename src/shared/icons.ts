import type { ExtensionInfo, IconInfo } from "./types";
import { getRuntimeId, getRuntimeUrl } from "./chrome";

const FALLBACK_ICON_PATH = "images/null.jpg";

export const getFallbackIconUrl = () => getRuntimeUrl(FALLBACK_ICON_PATH);

export const pickIconInfo = (icons: IconInfo[] | undefined, targetSize = 32): IconInfo | null => {
  const validIcons = icons?.filter((icon) => icon?.url && Number.isFinite(icon.size));
  if (!validIcons || validIcons.length === 0) {
    return null;
  }
  return [...validIcons].sort((a, b) => {
    const delta = Math.abs(a.size - targetSize) - Math.abs(b.size - targetSize);
    if (delta !== 0) {
      return delta;
    }
    return b.size - a.size;
  })[0];
};

export const isFirefoxBrowser = () => {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /firefox/i.test(navigator.userAgent);
};

const isAbsoluteUrl = (value: string) => /^[a-z][a-z0-9+.-]*:/.test(value);

const resolveRelativeIconUrl = (
  extension: ExtensionInfo,
  iconPath: string,
  isFirefox: boolean
): string | null => {
  const normalizedPath = iconPath.startsWith("/") ? iconPath.slice(1) : iconPath;
  const runtimeId = getRuntimeId();
  if (runtimeId && extension.id === runtimeId) {
    return getRuntimeUrl(normalizedPath);
  }

  if (!isFirefox && extension.id) {
    return `chrome-extension://${extension.id}/${normalizedPath}`;
  }

  if (extension.optionsUrl && isAbsoluteUrl(extension.optionsUrl)) {
    try {
      return new URL(normalizedPath, extension.optionsUrl).toString();
    } catch {
      return null;
    }
  }

  return null;
};

type ResolveOptions = {
  runtimeOrigin: string | null;
  isFirefox: boolean;
  trackObjectUrl?: (url: string) => void;
  targetSize?: number;
};

export const resolveExtensionIcon = async (
  extension: ExtensionInfo,
  { runtimeOrigin, isFirefox, trackObjectUrl, targetSize = 32 }: ResolveOptions
): Promise<string> => {
  const iconInfo = pickIconInfo(extension.icons, targetSize);
  if (!iconInfo?.url) {
    return getFallbackIconUrl();
  }

  let iconUrl = iconInfo.url;
  if (!isAbsoluteUrl(iconUrl)) {
    const resolved = resolveRelativeIconUrl(extension, iconUrl, isFirefox);
    if (!resolved) {
      return getFallbackIconUrl();
    }
    iconUrl = resolved;
  }
  if (!iconUrl.startsWith("moz-extension://")) {
    return iconUrl;
  }

  if (!runtimeOrigin) {
    return iconUrl;
  }

  let iconOrigin: string;
  try {
    const parsed = new URL(iconUrl);
    iconOrigin = `${parsed.protocol}//${parsed.host}`;
  } catch {
    return getFallbackIconUrl();
  }

  if (iconOrigin === runtimeOrigin) {
    return iconUrl;
  }

  if (!isFirefox) {
    return iconUrl;
  }

  try {
    const response = await fetch(iconUrl);
    if (!response.ok) {
      throw new Error("Icon fetch failed");
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    trackObjectUrl?.(objectUrl);
    return objectUrl;
  } catch {
    return getFallbackIconUrl();
  }
};

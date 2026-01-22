import type { ExtensionInfo, IconInfo } from "./types";
import { getRuntimeUrl } from "./chrome";

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

  const iconUrl = iconInfo.url;
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

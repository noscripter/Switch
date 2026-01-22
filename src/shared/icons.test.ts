import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtensionInfo } from "./types";
import { getFallbackIconUrl, isFirefoxBrowser, pickIconInfo, resolveExtensionIcon } from "./icons";

const makeExtension = (overrides: Partial<ExtensionInfo>): ExtensionInfo => {
  return {
    id: "ext-id",
    name: "Extension",
    shortName: "Extension",
    enabled: true,
    version: "1.0.0",
    homepageUrl: "",
    icons: [{ size: 16, url: "https://example.com/icon.png" }],
    ...overrides
  } as ExtensionInfo;
};

const setupRuntime = (getURL: (path: string) => string, id = "runtime-id") => {
  (globalThis as { chrome?: chrome }).chrome = {
    runtime: { getURL, id }
  } as unknown as chrome;
};

const resetGlobals = () => {
  delete (globalThis as { chrome?: unknown }).chrome;
  vi.unstubAllGlobals();
};

describe("icons helpers", () => {
  beforeEach(() => {
    resetGlobals();
    setupRuntime((path) => `moz-extension://current/${path}`);
  });

  afterEach(() => {
    resetGlobals();
    vi.restoreAllMocks();
  });

  it("selects the best icon based on size metadata", () => {
    const icons = [
      { size: 16, url: "a.png" },
      { size: 48, url: "b.png" },
      { size: 32, url: "c.png" }
    ];
    expect(pickIconInfo(icons, 32)?.url).toBe("c.png");

    const tieIcons = [
      { size: 16, url: "a.png" },
      { size: 48, url: "b.png" }
    ];
    expect(pickIconInfo(tieIcons, 32)?.url).toBe("b.png");
  });

  it("returns null when icon metadata is missing", () => {
    expect(pickIconInfo(undefined)).toBeNull();
    expect(pickIconInfo([])).toBeNull();
    expect(pickIconInfo([{ size: 16, url: "" }], 16)).toBeNull();
  });

  it("detects firefox user agents", () => {
    const originalNavigator = globalThis.navigator;
    vi.stubGlobal("navigator", undefined);
    expect(isFirefoxBrowser()).toBe(false);

    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 Firefox/120.0" });
    expect(isFirefoxBrowser()).toBe(true);

    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 Chrome/120.0" });
    expect(isFirefoxBrowser()).toBe(false);

    vi.stubGlobal("navigator", originalNavigator);
  });

  it("returns fallback when no icon url is available", async () => {
    const extension = makeExtension({ icons: undefined });
    const icon = await resolveExtensionIcon(extension, {
      runtimeOrigin: "moz-extension://current",
      isFirefox: false
    });
    expect(icon).toBe(getFallbackIconUrl());
  });

  it("returns non-moz icons directly", async () => {
    const extension = makeExtension({ icons: [{ size: 16, url: "https://example.com/icon.png" }] });
    const icon = await resolveExtensionIcon(extension, {
      runtimeOrigin: "moz-extension://current",
      isFirefox: false
    });
    expect(icon).toBe("https://example.com/icon.png");
  });

  it("returns moz icons when runtime origin is missing", async () => {
    const extension = makeExtension({ icons: [{ size: 16, url: "moz-extension://other/icon.png" }] });
    const icon = await resolveExtensionIcon(extension, {
      runtimeOrigin: null,
      isFirefox: true
    });
    expect(icon).toBe("moz-extension://other/icon.png");
  });

  it("returns fallback for invalid moz icon urls", async () => {
    const extension = makeExtension({ icons: [{ size: 16, url: "moz-extension://[::1" }] });
    const icon = await resolveExtensionIcon(extension, {
      runtimeOrigin: "moz-extension://current",
      isFirefox: true
    });
    expect(icon).toBe(getFallbackIconUrl());
  });

  it("resolves relative icon urls for the current extension", async () => {
    setupRuntime((path) => `moz-extension://current/${path}`, "self-id");
    const extension = makeExtension({ id: "self-id", icons: [{ size: 16, url: "icons/icon.png" }] });
    const icon = await resolveExtensionIcon(extension, {
      runtimeOrigin: "moz-extension://current",
      isFirefox: true
    });
    expect(icon).toBe("moz-extension://current/icons/icon.png");
  });

  it("builds chrome-extension urls for relative icons in chromium", async () => {
    const extension = makeExtension({ id: "abcd", icons: [{ size: 16, url: "icons/icon.png" }] });
    const icon = await resolveExtensionIcon(extension, {
      runtimeOrigin: "moz-extension://current",
      isFirefox: false
    });
    expect(icon).toBe("chrome-extension://abcd/icons/icon.png");
  });

  it("normalizes leading slashes in relative icon paths", async () => {
    const extension = makeExtension({ id: "abcd", icons: [{ size: 16, url: "/icons/icon.png" }] });
    const icon = await resolveExtensionIcon(extension, {
      runtimeOrigin: "moz-extension://current",
      isFirefox: false
    });
    expect(icon).toBe("chrome-extension://abcd/icons/icon.png");
  });

  it("falls back for relative icons when origin is unknown in firefox", async () => {
    const extension = makeExtension({ id: "abcd", icons: [{ size: 16, url: "icons/icon.png" }] });
    const icon = await resolveExtensionIcon(extension, {
      runtimeOrigin: "moz-extension://current",
      isFirefox: true
    });
    expect(icon).toBe(getFallbackIconUrl());
  });

  it("resolves relative icons using absolute optionsUrl", async () => {
    const extension = makeExtension({
      id: "opts",
      optionsUrl: "moz-extension://opts/options.html",
      icons: [{ size: 16, url: "icons/icon.png" }]
    });
    const icon = await resolveExtensionIcon(extension, {
      runtimeOrigin: null,
      isFirefox: true
    });
    expect(icon).toBe("moz-extension://opts/icons/icon.png");
  });

  it("falls back when optionsUrl is invalid", async () => {
    const extension = makeExtension({
      id: "opts-invalid",
      optionsUrl: "moz-extension://[::1",
      icons: [{ size: 16, url: "icons/icon.png" }]
    });

    const icon = await resolveExtensionIcon(extension, {
      runtimeOrigin: "moz-extension://current",
      isFirefox: true
    });

    expect(icon).toBe(getFallbackIconUrl());
  });

  it("keeps moz icons from the same origin", async () => {
    const extension = makeExtension({ icons: [{ size: 16, url: "moz-extension://same/icon.png" }] });
    const icon = await resolveExtensionIcon(extension, {
      runtimeOrigin: "moz-extension://same",
      isFirefox: true
    });
    expect(icon).toBe("moz-extension://same/icon.png");
  });

  it("keeps moz icons in non-firefox browsers", async () => {
    const extension = makeExtension({ icons: [{ size: 16, url: "moz-extension://other/icon.png" }] });
    const icon = await resolveExtensionIcon(extension, {
      runtimeOrigin: "moz-extension://current",
      isFirefox: false
    });
    expect(icon).toBe("moz-extension://other/icon.png");
  });

  it("fetches and converts moz icons in firefox", async () => {
    const extension = makeExtension({ icons: [{ size: 16, url: "moz-extension://other/icon.png" }] });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(["data"]))
    });
    const originalCreateObjectURL = URL.createObjectURL;
    if (!originalCreateObjectURL) {
      Object.defineProperty(URL, "createObjectURL", {
        value: () => "blob:icon",
        writable: true,
        configurable: true
      });
    }
    const objectUrlMock = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:icon");
    const track = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const icon = await resolveExtensionIcon(extension, {
      runtimeOrigin: "moz-extension://current",
      isFirefox: true,
      trackObjectUrl: track
    });

    expect(fetchMock).toHaveBeenCalledWith("moz-extension://other/icon.png");
    expect(objectUrlMock).toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith("blob:icon");
    expect(icon).toBe("blob:icon");

    objectUrlMock.mockRestore();
    if (!originalCreateObjectURL) {
      delete (URL as typeof URL & { createObjectURL?: unknown }).createObjectURL;
    }
  });

  it("returns fallback when moz icon fetch fails", async () => {
    const extension = makeExtension({ icons: [{ size: 16, url: "moz-extension://other/icon.png" }] });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      blob: vi.fn()
    });
    vi.stubGlobal("fetch", fetchMock);

    const icon = await resolveExtensionIcon(extension, {
      runtimeOrigin: "moz-extension://current",
      isFirefox: true
    });

    expect(icon).toBe(getFallbackIconUrl());
  });
});

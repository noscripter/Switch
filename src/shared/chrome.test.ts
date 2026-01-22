import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getManagement, getRuntimeId, getRuntimeOrigin, getRuntimeUrl } from "./chrome";

const resetGlobals = () => {
  delete (globalThis as { chrome?: unknown }).chrome;
  delete (globalThis as { browser?: unknown }).browser;
};

describe("chrome helpers", () => {
  beforeEach(() => {
    resetGlobals();
  });

  afterEach(() => {
    resetGlobals();
  });

  it("prefers chrome namespace when available", () => {
    const management = { getAll: vi.fn() } as unknown as chrome.management.Static;
    (globalThis as { chrome?: chrome }).chrome = {
      management,
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
        id: "chrome-id"
      }
    } as unknown as chrome;

    expect(getManagement()).toBe(management);
    expect(getRuntimeUrl("images/null.jpg")).toBe("chrome-extension://test/images/null.jpg");
    expect(getRuntimeOrigin()).toBe("chrome-extension://test");
    expect(getRuntimeId()).toBe("chrome-id");
  });

  it("falls back to browser namespace when chrome is missing", () => {
    const management = { getAll: vi.fn() } as unknown as chrome.management.Static;
    (globalThis as { browser?: unknown }).browser = {
      management,
      runtime: {
        getURL: (path: string) => `moz-extension://test/${path}`,
        id: "browser-id"
      }
    };

    expect(getManagement()).toBe(management);
    expect(getRuntimeUrl("images/null.jpg")).toBe("moz-extension://test/images/null.jpg");
    expect(getRuntimeOrigin()).toBe("moz-extension://test");
    expect(getRuntimeId()).toBe("browser-id");
  });

  it("uses browser runtime when management is absent", () => {
    (globalThis as { browser?: unknown }).browser = {
      runtime: {
        getURL: (path: string) => `moz-extension://runtime/${path}`
      }
    };

    expect(getManagement()).toBeNull();
    expect(getRuntimeUrl("images/null.jpg")).toBe("moz-extension://runtime/images/null.jpg");
  });

  it("returns null when api unavailable and handles invalid runtime urls", () => {
    (globalThis as { chrome?: chrome }).chrome = {
      runtime: {
        getURL: () => "invalid-url"
      }
    } as unknown as chrome;

    expect(getManagement()).toBeNull();
    expect(getRuntimeUrl("images/null.jpg")).toBe("invalid-url");
    expect(getRuntimeOrigin()).toBeNull();

    resetGlobals();
    expect(getManagement()).toBeNull();
    expect(getRuntimeUrl("images/null.jpg")).toBe("images/null.jpg");
  });

  it("returns null runtime id when missing", () => {
    (globalThis as { chrome?: chrome }).chrome = {
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`
      }
    } as unknown as chrome;

    expect(getRuntimeId()).toBeNull();
  });

  it("returns origin for standard urls", () => {
    (globalThis as { chrome?: chrome }).chrome = {
      runtime: {
        getURL: () => "https://example.com/path"
      }
    } as unknown as chrome;

    expect(getRuntimeOrigin()).toBe("https://example.com");
  });
});

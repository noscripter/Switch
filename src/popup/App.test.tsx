import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtensionInfo } from "../shared/types";
import App from "./App";

const resetGlobals = () => {
  delete (globalThis as { chrome?: unknown }).chrome;
  delete (globalThis as { browser?: unknown }).browser;
};

const makeExtension = (overrides: Partial<ExtensionInfo>): ExtensionInfo => {
  return {
    id: "ext-id",
    name: "Extension",
    shortName: "Extension",
    enabled: true,
    version: "1.0.0",
    homepageUrl: "https://example.com",
    icons: [{ size: 16, url: "https://example.com/icon.png" }],
    ...overrides
  } as ExtensionInfo;
};

const setupChrome = (
  extensions: ExtensionInfo[],
  asyncGetAll = false,
  getURL?: (path: string) => string
) => {
  const getAll = vi.fn((callback: (items: ExtensionInfo[]) => void) => {
    if (asyncGetAll) {
      setTimeout(() => callback(extensions), 0);
      return;
    }
    callback(extensions);
  });
  const setEnabled = vi.fn((_id: string, _enabled: boolean, callback?: () => void) => {
    callback?.();
  });

  (globalThis as { chrome?: chrome }).chrome = {
    management: {
      getAll,
      setEnabled
    } as unknown as chrome.management.Static,
    runtime: {
      getURL: getURL ?? ((path: string) => `moz-extension://current/${path}`)
    }
  } as unknown as chrome;

  return { getAll, setEnabled };
};

describe("Popup App", () => {
  beforeEach(() => {
    resetGlobals();
  });

  afterEach(() => {
    resetGlobals();
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders error when management api is unavailable", async () => {
    render(<App />);
    expect(await screen.findByText("management api unavailable")).toBeInTheDocument();
  });

  it("shows loading state then renders sorted list and summary", async () => {
    const enabled = makeExtension({ id: "enabled", name: "Alpha", shortName: "Alpha", enabled: true });
    const disabled = makeExtension({ id: "disabled", name: "Beta", shortName: "Beta", enabled: false });

    setupChrome([disabled, enabled], true);

    const { container } = render(<App />);

    expect(screen.getByText("loading...")).toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText(/Alpha@1.0.0/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    const entries = container.querySelectorAll(".extension");
    expect(entries[0]?.getAttribute("data-extname")).toBe("Alpha");
    expect(entries[1]?.getAttribute("data-extname")).toBe("Beta");
  });

  it("filters and highlights search results", async () => {
    const apple = makeExtension({ id: "apple", name: "Apple Tools", shortName: "Apple Tools" });
    const banana = makeExtension({ id: "banana", name: "Banana Bar", shortName: "Banana Bar" });

    setupChrome([apple, banana]);
    render(<App />);

    expect(await screen.findByText(/Apple Tools@1.0.0/)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Search/);
    const user = userEvent.setup();
    await user.type(input, "Apple");

    expect(screen.queryByText(/Banana Bar@1.0.0/)).toBeNull();
    const highlight = screen.getByText("Apple");
    expect(highlight).toHaveClass("highlight");
  });

  it("sorts filtered results with enabled items first", async () => {
    const enabled = makeExtension({ id: "alpha", name: "Alpha Tool", shortName: "Alpha Tool", enabled: true });
    const disabled = makeExtension({ id: "beta", name: "Beta Tool", shortName: "Beta Tool", enabled: false });

    setupChrome([disabled, enabled]);
    const { container } = render(<App />);

    expect(await screen.findByText(/Alpha Tool@1.0.0/)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Search/);
    const user = userEvent.setup();
    await user.type(input, "Tool");

    const entries = container.querySelectorAll(".extension");
    expect(entries[0]?.getAttribute("data-extname")).toBe("Alpha Tool");
    expect(entries[1]?.getAttribute("data-extname")).toBe("Beta Tool");
  });

  it("toggles extension enabled state", async () => {
    const disabled = makeExtension({ id: "gamma", name: "Gamma", shortName: "Gamma", enabled: false });
    const other = makeExtension({ id: "delta", name: "Delta", shortName: "Delta", enabled: true });
    const { setEnabled } = setupChrome([disabled, other]);

    const { container } = render(<App />);
    expect(await screen.findByText(/Gamma@1.0.0/)).toBeInTheDocument();

    const checkbox = container.querySelector("#gamma") as HTMLInputElement | null;
    const otherCheckbox = container.querySelector("#delta") as HTMLInputElement | null;
    expect(checkbox).not.toBeChecked();
    expect(otherCheckbox).toBeChecked();

    await userEvent.click(checkbox as HTMLInputElement);

    expect(setEnabled).toHaveBeenCalledWith("gamma", true, expect.any(Function));
    expect(checkbox).toBeChecked();
    expect(otherCheckbox).toBeChecked();
  });

  it("skips toggle when management is missing", async () => {
    const enabled = makeExtension({ id: "theta", name: "Theta", shortName: "Theta", enabled: true });

    render(
      <App
        managementOverride={null}
        initialExtensions={[enabled]}
        disableAutoLoad
      />
    );

    const checkbox = await screen.findByRole("checkbox");
    expect(checkbox).toBeChecked();

    await userEvent.click(checkbox);

    expect(checkbox).toBeChecked();
  });

  it("handles icon fallback, missing homepage, and unknown names", async () => {
    const missingName = makeExtension({
      id: "unknown",
      name: "",
      shortName: "",
      homepageUrl: "",
      icons: undefined
    });
    const mismatchedIcon = makeExtension({
      id: "mismatch",
      name: "Mismatch",
      shortName: "Mismatch",
      icons: [{ size: 16, url: "moz-extension://other/icon.png" }]
    });
    const invalidUrlIcon = makeExtension({
      id: "invalid",
      name: "Invalid",
      shortName: "Invalid",
      icons: [{ size: 16, url: "moz-extension://[::1" }]
    });
    const brokenIcon = makeExtension({
      id: "broken",
      name: "Broken",
      shortName: "Broken",
      icons: [{ size: 16, url: "http://bad/icon.png" }]
    });

    setupChrome([missingName, mismatchedIcon, invalidUrlIcon, brokenIcon]);
    const { container } = render(<App />);

    expect(await screen.findByText(/Unknown@1.0.0/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Unknown@1.0.0/ })).toBeNull();

    const unknownIcon = container.querySelector("#Unknown_icon") as HTMLImageElement | null;
    const mismatchIcon = container.querySelector("#Mismatch_icon") as HTMLImageElement | null;
    const invalidIcon = container.querySelector("#Invalid_icon") as HTMLImageElement | null;
    const brokenIconEl = container.querySelector("#Broken_icon") as HTMLImageElement | null;

    expect(unknownIcon?.getAttribute("src")).toContain("images/null.jpg");
    expect(mismatchIcon?.getAttribute("src")).toContain("images/null.jpg");
    expect(invalidIcon?.getAttribute("src")).toContain("images/null.jpg");

    expect(brokenIconEl?.getAttribute("src")).toBe("http://bad/icon.png");
    fireEvent.error(brokenIconEl as HTMLImageElement);
    expect(brokenIconEl?.getAttribute("src")).toContain("images/null.jpg");
  });

  it("handles empty extension list from management", async () => {
    (globalThis as { chrome?: chrome }).chrome = {
      management: {
        getAll: (callback: (items: ExtensionInfo[] | null) => void) => callback(null),
        setEnabled: vi.fn()
      } as unknown as chrome.management.Static,
      runtime: {
        getURL: (path: string) => `moz-extension://current/${path}`
      }
    } as unknown as chrome;

    const { container } = render(<App />);

    expect(await screen.findByText("0", { selector: "#enabled" })).toBeInTheDocument();
    expect(container.querySelectorAll(".extension")).toHaveLength(0);
  });

  it("keeps moz-extension icon when runtime origin is unavailable", async () => {
    const extension = makeExtension({
      id: "runtime-null",
      name: "Runtime Null",
      shortName: "Runtime Null",
      icons: [{ size: 16, url: "moz-extension://same/icon.png" }]
    });

    setupChrome([extension], false, () => "invalid-url");
    const { container } = render(<App />);

    expect(await screen.findByText(/Runtime Null@1.0.0/)).toBeInTheDocument();
    const icon = container.querySelector('[id="Runtime Null_icon"]') as HTMLImageElement | null;
    expect(icon?.getAttribute("src")).toBe("moz-extension://same/icon.png");
  });

  it("truncates long names in the label", async () => {
    const longName = "This is a very long extension name";
    const extension = makeExtension({ id: "long", name: longName, shortName: longName });

    setupChrome([extension]);
    render(<App />);

    const label = await screen.findByText(/@1.0.0/);
    expect(label.textContent?.length).toBeLessThan(longName.length + "@1.0.0".length);
  });
});

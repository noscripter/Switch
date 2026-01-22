import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

const setupChrome = (extensions: ExtensionInfo[], asyncGetAll = false) => {
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
      getURL: (path: string) => `moz-extension://current/${path}`
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
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders error when management api is unavailable", async () => {
    render(<App />);
    expect(await screen.findByText("management api unavailable")).toBeInTheDocument();
  });

  it("shows loading state then renders sorted list and summary", async () => {
    vi.useFakeTimers();
    const enabled = makeExtension({ id: "enabled", name: "Alpha", shortName: "Alpha", enabled: true });
    const disabled = makeExtension({ id: "disabled", name: "Beta", shortName: "Beta", enabled: false });

    setupChrome([disabled, enabled], true);

    const { container } = render(<App />);

    expect(screen.getByText("loading...")).toBeInTheDocument();

    await act(async () => {
      vi.runAllTimers();
    });

    expect(await screen.findByText(/Alpha@1.0.0/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    const entries = container.querySelectorAll(".extension");
    expect(entries[0]?.getAttribute("extname")).toBe("Alpha");
    expect(entries[1]?.getAttribute("extname")).toBe("Beta");
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

  it("toggles extension enabled state", async () => {
    const disabled = makeExtension({ id: "gamma", name: "Gamma", shortName: "Gamma", enabled: false });
    const { setEnabled } = setupChrome([disabled]);

    render(<App />);
    const checkbox = await screen.findByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await userEvent.click(checkbox);

    expect(setEnabled).toHaveBeenCalledWith("gamma", true, expect.any(Function));
    expect(checkbox).toBeChecked();
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
    const brokenIcon = makeExtension({
      id: "broken",
      name: "Broken",
      shortName: "Broken",
      icons: [{ size: 16, url: "http://bad/icon.png" }]
    });

    setupChrome([missingName, mismatchedIcon, brokenIcon]);
    const { container } = render(<App />);

    expect(await screen.findByText(/Unknown@1.0.0/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Unknown@1.0.0/ })).toBeNull();

    const images = container.querySelectorAll("img.icons");
    expect(images[0]?.getAttribute("src")).toContain("images/null.jpg");
    expect(images[1]?.getAttribute("src")).toContain("images/null.jpg");

    fireEvent.error(images[2] as HTMLImageElement);
    expect(images[2]?.getAttribute("src")).toContain("images/null.jpg");
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

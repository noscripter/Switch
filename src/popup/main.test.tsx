import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("popup entry", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders when root element exists", async () => {
    const renderMock = vi.fn();
    const createRootMock = vi.fn(() => ({ render: renderMock }));

    vi.doMock("react-dom/client", () => ({
      createRoot: createRootMock
    }));

    document.body.innerHTML = "<div id=\"root\"></div>";

    await import("./main");

    expect(createRootMock).toHaveBeenCalled();
    expect(renderMock).toHaveBeenCalled();
  });

  it("skips rendering when root element is missing", async () => {
    const createRootMock = vi.fn();

    vi.doMock("react-dom/client", () => ({
      createRoot: createRootMock
    }));

    await import("./main");

    expect(createRootMock).not.toHaveBeenCalled();
  });
});

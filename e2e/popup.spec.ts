import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = process.env.E2E_DIST ?? path.resolve(__dirname, "..", "dist", "mv2", "popup", "index.html");
const fileUrl = `file://${distPath}`;

const extensions = [
  {
    id: "alpha",
    name: "Alpha",
    shortName: "Alpha",
    enabled: true,
    version: "1.0.0",
    homepageUrl: "https://example.com",
    icons: [{ size: 16, url: "https://example.com/icon.png" }]
  },
  {
    id: "beta",
    name: "Beta",
    shortName: "Beta",
    enabled: false,
    version: "1.0.0",
    homepageUrl: "https://example.com",
    icons: [{ size: 16, url: "https://example.com/icon.png" }]
  }
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ items }) => {
    const mutable = items.map((item: typeof items[number]) => ({ ...item }));
    (window as unknown as { chrome?: unknown }).chrome = {
      runtime: {
        getURL: (path: string) => `moz-extension://current/${path}`
      },
      management: {
        getAll: (callback: (items: typeof mutable) => void) => callback(mutable),
        setEnabled: (id: string, enabled: boolean, callback?: () => void) => {
          const target = mutable.find((item) => item.id === id);
          if (target) {
            target.enabled = enabled;
          }
          callback?.();
        }
      }
    };
  }, { items: extensions });
});

test("renders popup and keeps enabled extensions first", async ({ page }) => {
  await page.goto(fileUrl);

  await expect(page.getByText("Alpha@1.0.0")).toBeVisible();
  await expect(page.getByText("Beta@1.0.0")).toBeVisible();

  const firstEntry = page.locator(".extension").first();
  await expect(firstEntry).toContainText("Alpha@1.0.0");
});

test("filters by search and toggles enabled state", async ({ page }) => {
  await page.goto(fileUrl);

  const search = page.locator("#search");
  await search.fill("Beta");
  await expect(page.getByText("Beta@1.0.0")).toBeVisible();
  await expect(page.getByText("Alpha@1.0.0")).toHaveCount(0);

  const checkbox = page.getByRole("checkbox").first();
  await checkbox.click();
  await expect(checkbox).toBeChecked();
});

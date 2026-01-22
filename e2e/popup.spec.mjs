import { expect, test } from "@playwright/test";

const popupUrl = "/popup/index.html";

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
    const mutable = items.map((item) => ({ ...item }));
    window.chrome = {
      runtime: {
        getURL: (path) => `moz-extension://current/${path}`
      },
      management: {
        getAll: (callback) => callback(mutable),
        setEnabled: (id, enabled, callback) => {
          const target = mutable.find((item) => item.id === id);
          if (target) {
            target.enabled = enabled;
          }
          if (callback) {
            callback();
          }
        }
      }
    };
  }, { items: extensions });
});

test("renders popup and keeps enabled extensions first", async ({ page }) => {
  await page.goto(popupUrl);

  await expect(page.getByText("Alpha@1.0.0")).toBeVisible();
  await expect(page.getByText("Beta@1.0.0")).toBeVisible();

  const firstEntry = page.locator(".extension").first();
  await expect(firstEntry).toContainText("Alpha@1.0.0");
});

test("filters by search and toggles enabled state", async ({ page }) => {
  await page.goto(popupUrl);

  const search = page.locator("#search");
  await search.fill("Beta");
  await expect(page.getByText("Beta@1.0.0")).toBeVisible();
  await expect(page.getByText("Alpha@1.0.0")).toHaveCount(0);

  const checkbox = page.getByRole("checkbox").first();
  await checkbox.click();
  await expect(checkbox).toBeChecked();
});

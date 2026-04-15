import { test, expect } from "@playwright/test";

test.describe("dashboard test runner", () => {
  test("renders visual controls and status indicators", async ({ page }) => {
    await page.goto("/en/dashboard/test-runner");
    await page.waitForResponse(
      (res) => res.url().includes("/api/test-runner/scenarios") && res.ok(),
      { timeout: 30000 }
    );
    await expect(page.getByText("Loading test runner…")).toHaveCount(0, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: "Test Runner" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Run all scenarios" })).toBeVisible();
    await expect(page.getByText("PASS")).toBeVisible();
    await expect(page.getByText("FAIL")).toBeVisible();
    await expect(page.getByText("RUNNING")).toBeVisible();
  });

  test("starts a single scenario run from row action", async ({ page }) => {
    test.setTimeout(300000);
    await page.goto("/en/dashboard/test-runner");
    await page.waitForResponse(
      (res) => res.url().includes("/api/test-runner/scenarios") && res.ok(),
      { timeout: 30000 }
    );
    const rowButton = page.locator("tbody tr").first().getByRole("button", { name: "Run" });
    await expect(rowButton).toBeVisible({ timeout: 30000 });
    await expect(rowButton).toBeEnabled({ timeout: 240000 });
    await rowButton.click();
    await expect(page.getByText("RUNNING")).toBeVisible();
  });
});

/**
 * @smoke
 *
 * Lightweight CI smoke tests — run with: npx playwright test --grep @smoke
 *
 * Rules for smoke tests:
 *  - Target only static/auth pages that render without a running backend.
 *  - Never call an API route that requires MongoDB or the security-api.
 *  - Keep each test under 10 s.
 */

import { test, expect } from "@playwright/test";

test.describe("@smoke — static pages render without errors", () => {
  test("home page loads and returns 200", async ({ page }) => {
    const response = await page.goto("/en");
    expect(response?.status()).toBe(200);
    // The page must have a <body> — i.e. it is not a blank crash screen.
    await expect(page.locator("body")).toBeVisible();
  });

  test("login page loads and shows the login form", async ({ page }) => {
    const response = await page.goto("/en/login");
    expect(response?.status()).toBe(200);
    // A login form is present — checks that the auth layout renders correctly.
    await expect(
      page.getByRole("textbox", { name: /email/i }).or(
        page.locator('input[type="email"]')
      )
    ).toBeVisible({ timeout: 8000 });
  });

  test("register page loads and shows the registration form", async ({
    page,
  }) => {
    const response = await page.goto("/en/register");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("textbox", { name: /email/i }).or(
        page.locator('input[type="email"]')
      )
    ).toBeVisible({ timeout: 8000 });
  });

  test("download page loads", async ({ page }) => {
    const response = await page.goto("/en/download");
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).toBeVisible();
  });
});

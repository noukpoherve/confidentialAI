# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test-runner.spec.ts >> dashboard test runner >> renders visual controls and status indicators
- Location: tests/e2e/test-runner.spec.ts:4:7

# Error details

```
TimeoutError: page.waitForResponse: Timeout 30000ms exceeded while waiting for event "response"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - link "← Confidential Agent" [ref=e4] [cursor=pointer]:
        - /url: /en
    - generic [ref=e6]:
      - heading "Log in" [level=1] [ref=e7]
      - paragraph [ref=e8]: Email and password or OAuth (design only).
      - generic [ref=e9]:
        - generic [ref=e10]:
          - generic [ref=e11]: Email
          - textbox [ref=e12]
        - generic [ref=e13]:
          - generic [ref=e14]: Password
          - textbox [ref=e15]
        - button "Continue" [ref=e16]
      - paragraph [ref=e17]:
        - link "Sign up" [ref=e18] [cursor=pointer]:
          - /url: /en/register
  - button "Open Next.js Dev Tools" [ref=e24] [cursor=pointer]:
    - img [ref=e25]
  - alert [ref=e28]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("dashboard test runner", () => {
  4  |   test("renders visual controls and status indicators", async ({ page }) => {
  5  |     await page.goto("/en/dashboard/test-runner");
> 6  |     await page.waitForResponse(
     |                ^ TimeoutError: page.waitForResponse: Timeout 30000ms exceeded while waiting for event "response"
  7  |       (res) => res.url().includes("/api/test-runner/scenarios") && res.ok(),
  8  |       { timeout: 30000 }
  9  |     );
  10 |     await expect(page.getByText("Loading test runner…")).toHaveCount(0, { timeout: 30000 });
  11 |     await expect(page.getByRole("heading", { name: "Test Runner" })).toBeVisible();
  12 |     await expect(page.getByRole("button", { name: "Run all scenarios" })).toBeVisible();
  13 |     await expect(page.getByText("PASS")).toBeVisible();
  14 |     await expect(page.getByText("FAIL")).toBeVisible();
  15 |     await expect(page.getByText("RUNNING")).toBeVisible();
  16 |   });
  17 | 
  18 |   test("starts a single scenario run from row action", async ({ page }) => {
  19 |     test.setTimeout(300000);
  20 |     await page.goto("/en/dashboard/test-runner");
  21 |     await page.waitForResponse(
  22 |       (res) => res.url().includes("/api/test-runner/scenarios") && res.ok(),
  23 |       { timeout: 30000 }
  24 |     );
  25 |     const rowButton = page.locator("tbody tr").first().getByRole("button", { name: "Run" });
  26 |     await expect(rowButton).toBeVisible({ timeout: 30000 });
  27 |     await expect(rowButton).toBeEnabled({ timeout: 240000 });
  28 |     await rowButton.click();
  29 |     await expect(page.getByText("RUNNING")).toBeVisible();
  30 |   });
  31 | });
  32 | 
```
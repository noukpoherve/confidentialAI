# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test-runner.spec.ts >> dashboard test runner >> renders visual controls and status indicators
- Location: tests/e2e/test-runner.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('PASS')
Expected: visible
Error: strict mode violation: getByText('PASS') resolved to 15 elements:
    1) <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">PASS</p> aka getByText('PASS', { exact: true })
    2) <span class="rounded-full border px-2 py-1 text-xs font-semibold uppercase border-emerald-200 bg-emerald-50 text-emerald-800">pass</span> aka getByText('pass').nth(1)
    3) <pre class="whitespace-pre-wrap">..................                               …</pre> aka getByText('[100%] 18 passed in 3.21s')
    4) <span class="rounded-full border px-2 py-1 text-xs font-semibold uppercase border-emerald-200 bg-emerald-50 text-emerald-800">pass</span> aka getByText('pass').nth(3)
    5) <pre class="whitespace-pre-wrap">..........................                       …</pre> aka getByText('[100%] 26 passed in 2.70s')
    6) <span class="rounded-full border px-2 py-1 text-xs font-semibold uppercase border-emerald-200 bg-emerald-50 text-emerald-800">pass</span> aka getByText('pass').nth(5)
    7) <pre class="whitespace-pre-wrap">......                                           …</pre> aka getByText('...... [100').nth(2)
    8) <span class="rounded-full border px-2 py-1 text-xs font-semibold uppercase border-emerald-200 bg-emerald-50 text-emerald-800">pass</span> aka getByText('pass', { exact: true }).nth(3)
    9) <pre class="whitespace-pre-wrap">...                                              …</pre> aka getByText('... [100').nth(3)
    10) <span class="rounded-full border px-2 py-1 text-xs font-semibold uppercase border-emerald-200 bg-emerald-50 text-emerald-800">pass</span> aka getByText('pass', { exact: true }).nth(4)
    ...

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for getByText('PASS')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - link "Confidential Agent" [ref=e5] [cursor=pointer]:
          - /url: /en/dashboard
        - paragraph [ref=e6]: Project
      - navigation [ref=e7]:
        - paragraph [ref=e8]: Project
        - link "Overview" [ref=e9] [cursor=pointer]:
          - /url: /en/dashboard
        - link "API keys" [ref=e10] [cursor=pointer]:
          - /url: /en/dashboard/api-keys
        - link "Usage & quotas" [ref=e11] [cursor=pointer]:
          - /url: /en/dashboard/usage
        - link "Incidents" [ref=e12] [cursor=pointer]:
          - /url: /en/dashboard/incidents
        - link "Site health" [ref=e13] [cursor=pointer]:
          - /url: /en/dashboard/site-health
        - link "Test runner" [ref=e14] [cursor=pointer]:
          - /url: /en/dashboard/test-runner
        - link "Billing" [ref=e15] [cursor=pointer]:
          - /url: /en/dashboard/billing
        - link "Settings" [ref=e16] [cursor=pointer]:
          - /url: /en/dashboard/settings
        - link "API reference" [ref=e17] [cursor=pointer]:
          - /url: /en/dashboard/api-reference
      - generic [ref=e18]:
        - generic [ref=e19]:
          - paragraph [ref=e20]: Credits
          - paragraph [ref=e21]: $0.00
          - button "Top up" [ref=e22]
        - generic [ref=e23]:
          - generic [ref=e24]: O
          - generic [ref=e25]:
            - paragraph [ref=e26]: Operator
            - paragraph [ref=e27]: you@company.com
    - generic [ref=e28]:
      - banner [ref=e29]:
        - generic [ref=e30]:
          - generic [ref=e31]: /
          - generic [ref=e32]: Project / Default
        - link "Product home" [ref=e33] [cursor=pointer]:
          - /url: /en
      - generic [ref=e34]: Sample banner — connect real system messages here.
      - main [ref=e35]:
        - generic [ref=e36]:
          - generic [ref=e37]:
            - generic [ref=e38]:
              - heading "Test Runner" [level=2] [ref=e39]
              - paragraph [ref=e40]: Run backend, frontend, and E2E scenarios from one visual dashboard.
            - generic [ref=e41]:
              - button "Run all scenarios" [disabled] [ref=e42]
              - button "Run selected" [disabled] [ref=e43]
          - generic [ref=e44]:
            - generic [ref=e45]:
              - paragraph [ref=e46]: PASS
              - paragraph [ref=e47]: "7"
            - generic [ref=e48]:
              - paragraph [ref=e49]: FAIL
              - paragraph [ref=e50]: "0"
            - generic [ref=e51]:
              - paragraph [ref=e52]: RUNNING
              - paragraph [ref=e53]: "0"
            - generic [ref=e54]:
              - paragraph [ref=e55]: IDLE
              - paragraph [ref=e56]: "1"
          - table [ref=e58]:
            - rowgroup [ref=e59]:
              - row "Scenario Layer Status Duration Actions" [ref=e60]:
                - columnheader "Scenario" [ref=e61]
                - columnheader "Layer" [ref=e62]
                - columnheader "Status" [ref=e63]
                - columnheader "Duration" [ref=e64]
                - columnheader "Actions" [ref=e65]
            - rowgroup [ref=e66]:
              - row "Backend · Policy engine Core allow/anonymize/warn/block decisions and AVS thresholds. policy · security backend pass 5.2s Run" [ref=e67]:
                - cell "Backend · Policy engine Core allow/anonymize/warn/block decisions and AVS thresholds. policy · security" [ref=e68]:
                  - generic [ref=e69] [cursor=pointer]:
                    - radio "Backend · Policy engine Core allow/anonymize/warn/block decisions and AVS thresholds. policy · security" [ref=e70]
                    - generic [ref=e71]:
                      - generic [ref=e72]: Backend · Policy engine
                      - generic [ref=e73]: Core allow/anonymize/warn/block decisions and AVS thresholds.
                      - generic [ref=e74]: policy · security
                - cell "backend" [ref=e75]
                - cell "pass" [ref=e76]
                - cell "5.2s" [ref=e77]
                - cell "Run" [ref=e78]:
                  - generic [ref=e79]:
                    - button "Run" [disabled] [ref=e80]
                    - group [ref=e81]:
                      - generic "View logs" [ref=e82] [cursor=pointer]
              - row "Backend · Detectors Regex/spaCy detectors for PII, toxicity, URLs, and false positives. detectors · toxicity · pii backend pass 4.4s Run" [ref=e83]:
                - cell "Backend · Detectors Regex/spaCy detectors for PII, toxicity, URLs, and false positives. detectors · toxicity · pii" [ref=e84]:
                  - generic [ref=e85] [cursor=pointer]:
                    - radio "Backend · Detectors Regex/spaCy detectors for PII, toxicity, URLs, and false positives. detectors · toxicity · pii" [ref=e86]
                    - generic [ref=e87]:
                      - generic [ref=e88]: Backend · Detectors
                      - generic [ref=e89]: Regex/spaCy detectors for PII, toxicity, URLs, and false positives.
                      - generic [ref=e90]: detectors · toxicity · pii
                - cell "backend" [ref=e91]
                - cell "pass" [ref=e92]
                - cell "4.4s" [ref=e93]
                - cell "Run" [ref=e94]:
                  - generic [ref=e95]:
                    - button "Run" [disabled] [ref=e96]
                    - group [ref=e97]:
                      - generic "View logs" [ref=e98] [cursor=pointer]
              - row "Backend · LangGraph orchestrator Node ordering, skip-paths, and final decision assembly. langgraph · orchestrator backend pass 19.1s Run" [ref=e99]:
                - cell "Backend · LangGraph orchestrator Node ordering, skip-paths, and final decision assembly. langgraph · orchestrator" [ref=e100]:
                  - generic [ref=e101] [cursor=pointer]:
                    - radio "Backend · LangGraph orchestrator Node ordering, skip-paths, and final decision assembly. langgraph · orchestrator" [ref=e102]
                    - generic [ref=e103]:
                      - generic [ref=e104]: Backend · LangGraph orchestrator
                      - generic [ref=e105]: Node ordering, skip-paths, and final decision assembly.
                      - generic [ref=e106]: langgraph · orchestrator
                - cell "backend" [ref=e107]
                - cell "pass" [ref=e108]
                - cell "19.1s" [ref=e109]
                - cell "Run" [ref=e110]:
                  - generic [ref=e111]:
                    - button "Run" [disabled] [ref=e112]
                    - group [ref=e113]:
                      - generic "View logs" [ref=e114] [cursor=pointer]
              - row "Backend · API incidents Analyze/validate-response incident persistence and retrieval. api · incidents backend pass 15.8s Run" [ref=e115]:
                - cell "Backend · API incidents Analyze/validate-response incident persistence and retrieval. api · incidents" [ref=e116]:
                  - generic [ref=e117] [cursor=pointer]:
                    - radio "Backend · API incidents Analyze/validate-response incident persistence and retrieval. api · incidents" [ref=e118]
                    - generic [ref=e119]:
                      - generic [ref=e120]: Backend · API incidents
                      - generic [ref=e121]: Analyze/validate-response incident persistence and retrieval.
                      - generic [ref=e122]: api · incidents
                - cell "backend" [ref=e123]
                - cell "pass" [ref=e124]
                - cell "15.8s" [ref=e125]
                - cell "Run" [ref=e126]:
                  - generic [ref=e127]:
                    - button "Run" [disabled] [ref=e128]
                    - group [ref=e129]:
                      - generic "View logs" [ref=e130] [cursor=pointer]
              - row "Backend · Toxicity analyzer Rephrase suggestions, fallback logic, and action transitions. toxicity · rephrase backend pass 9.0s Run" [ref=e131]:
                - cell "Backend · Toxicity analyzer Rephrase suggestions, fallback logic, and action transitions. toxicity · rephrase" [ref=e132]:
                  - generic [ref=e133] [cursor=pointer]:
                    - radio "Backend · Toxicity analyzer Rephrase suggestions, fallback logic, and action transitions. toxicity · rephrase" [ref=e134]
                    - generic [ref=e135]:
                      - generic [ref=e136]: Backend · Toxicity analyzer
                      - generic [ref=e137]: Rephrase suggestions, fallback logic, and action transitions.
                      - generic [ref=e138]: toxicity · rephrase
                - cell "backend" [ref=e139]
                - cell "pass" [ref=e140]
                - cell "9.0s" [ref=e141]
                - cell "Run" [ref=e142]:
                  - generic [ref=e143]:
                    - button "Run" [disabled] [ref=e144]
                    - group [ref=e145]:
                      - generic "View logs" [ref=e146] [cursor=pointer]
              - row "Backend · Auth and settings Signup/login/profile and user settings sync contract. auth · settings backend pass 2.6s Run" [ref=e147]:
                - cell "Backend · Auth and settings Signup/login/profile and user settings sync contract. auth · settings" [ref=e148]:
                  - generic [ref=e149] [cursor=pointer]:
                    - radio "Backend · Auth and settings Signup/login/profile and user settings sync contract. auth · settings" [ref=e150]
                    - generic [ref=e151]:
                      - generic [ref=e152]: Backend · Auth and settings
                      - generic [ref=e153]: Signup/login/profile and user settings sync contract.
                      - generic [ref=e154]: auth · settings
                - cell "backend" [ref=e155]
                - cell "pass" [ref=e156]
                - cell "2.6s" [ref=e157]
                - cell "Run" [ref=e158]:
                  - generic [ref=e159]:
                    - button "Run" [disabled] [ref=e160]
                    - group [ref=e161]:
                      - generic "View logs" [ref=e162] [cursor=pointer]
              - row "Frontend · Extension unit tests DOM and utility tests for extension behavior. extension · vitest frontend pass 6.3s Run" [ref=e163]:
                - cell "Frontend · Extension unit tests DOM and utility tests for extension behavior. extension · vitest" [ref=e164]:
                  - generic [ref=e165] [cursor=pointer]:
                    - radio "Frontend · Extension unit tests DOM and utility tests for extension behavior. extension · vitest" [ref=e166]
                    - generic [ref=e167]:
                      - generic [ref=e168]: Frontend · Extension unit tests
                      - generic [ref=e169]: DOM and utility tests for extension behavior.
                      - generic [ref=e170]: extension · vitest
                - cell "frontend" [ref=e171]
                - cell "pass" [ref=e172]
                - cell "6.3s" [ref=e173]
                - cell "Run" [ref=e174]:
                  - generic [ref=e175]:
                    - button "Run" [disabled] [ref=e176]
                    - group [ref=e177]:
                      - generic "View logs" [ref=e178] [cursor=pointer]
              - row "E2E · Dashboard test runner UI Visual workflow for run-all and per-scenario execution. dashboard · playwright e2e idle 0ms Run" [ref=e179]:
                - cell "E2E · Dashboard test runner UI Visual workflow for run-all and per-scenario execution. dashboard · playwright" [ref=e180]:
                  - generic [ref=e181] [cursor=pointer]:
                    - radio "E2E · Dashboard test runner UI Visual workflow for run-all and per-scenario execution. dashboard · playwright" [ref=e182]
                    - generic [ref=e183]:
                      - generic [ref=e184]: E2E · Dashboard test runner UI
                      - generic [ref=e185]: Visual workflow for run-all and per-scenario execution.
                      - generic [ref=e186]: dashboard · playwright
                - cell "e2e" [ref=e187]
                - cell "idle" [ref=e188]
                - cell "0ms" [ref=e189]
                - cell "Run" [ref=e190]:
                  - generic [ref=e191]:
                    - button "Run" [disabled] [ref=e192]
                    - group [ref=e193]:
                      - generic "View logs" [ref=e194] [cursor=pointer]
  - button "Open Next.js Dev Tools" [ref=e200] [cursor=pointer]:
    - img [ref=e201]
  - alert [ref=e204]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("dashboard test runner", () => {
  4  |   test("renders visual controls and status indicators", async ({ page }) => {
  5  |     await page.goto("/en/dashboard/test-runner");
  6  |     await page.waitForResponse(
  7  |       (res) => res.url().includes("/api/test-runner/scenarios") && res.ok(),
  8  |       { timeout: 30000 }
  9  |     );
  10 |     await expect(page.getByText("Loading test runner…")).toHaveCount(0, { timeout: 30000 });
  11 |     await expect(page.getByRole("heading", { name: "Test Runner" })).toBeVisible();
  12 |     await expect(page.getByRole("button", { name: "Run all scenarios" })).toBeVisible();
> 13 |     await expect(page.getByText("PASS")).toBeVisible();
     |                                          ^ Error: expect(locator).toBeVisible() failed
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
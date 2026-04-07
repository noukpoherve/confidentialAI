# admin-dashboard

Next.js dashboard for incident and policy supervision.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Test Runner (visual)

The dashboard now includes a visual test runner page:

- `http://localhost:3000/en/dashboard/test-runner`
- `http://localhost:3000/fr/dashboard/test-runner`

Features:

- Run all scenarios (backend + frontend + e2e)
- Run one scenario at a time
- Color indicators:
  - green: PASS
  - red: FAIL
  - amber: RUNNING
  - neutral: IDLE
- Per-scenario logs (stdout/stderr)

## E2E (Playwright)

```bash
npm run test:e2e
```

## Useful variable

- `NEXT_PUBLIC_SECURITY_API_URL` (default: `http://localhost:8080`)

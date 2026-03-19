# browser-extension

Chrome MV3 extension that intercepts prompts on AI platforms.

## V1 Features

- supported-page detection (ChatGPT, Claude, Gemini)
- pre-submit interception (Enter / send-like button click)
- backend call to `POST /v1/analyze`
- backend call to `POST /v1/validate-response` for AI output checks
- actions:
  - `ALLOW`: do nothing
  - `ANONYMIZE`: open review modal, then auto-filter on user choice
  - `BLOCK`: open review modal and prevent direct submission
  - `WARN`: open review modal for manual edit or auto-filter
- response-side actions:
  - `ANONYMIZE`: redact sensitive parts in rendered response
  - `BLOCK`: mask response content in UI
  - `WARN`: ask user whether to keep response visible

## Local installation

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Load `apps/browser-extension` with "Load unpacked"
4. Open extension options and configure the API URL

## Key files

- `manifest.json`: MV3 declaration
- `src/contentScript.js`: interception and local logic
- `src/background.js`: HTTP calls to the API
- `src/redactor.js`: local anonymization
- `src/siteConfigs.js`: platform recognition

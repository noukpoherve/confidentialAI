# browser-extension

Chrome MV3 extension that intercepts prompts on AI platforms.

## V1 Features

- supported-page detection (ChatGPT, Claude, Gemini)
- pre-submit interception (Enter / send-like button click)
- backend call to `POST /v1/analyze`
- actions:
  - `ALLOW`: do nothing
  - `ANONYMIZE`: apply local redaction
  - `BLOCK`: block submission
  - `WARN`: ask for confirmation

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

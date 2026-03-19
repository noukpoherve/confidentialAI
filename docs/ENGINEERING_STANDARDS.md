# Engineering Standards

These rules apply to every new feature and refactor in this repository.

## 1) Unit tests are mandatory

- Every new feature must include unit tests for new logic.
- Every bug fix must include at least one regression test.
- Existing tests must continue to pass before merge.
- Minimum local check before commit:
  - backend: `cd services/security-api && uv run pytest`

## 2) Documentation and comments language

- All technical documentation must be written in English.
- All code comments and docstrings must be written in English.
- User-facing product copy should also default to English unless localization is intentional.

## 3) Comment quality

- Do not comment every obvious line.
- Add comments for intent, trade-offs, and non-trivial logic.
- Keep comments short, precise, and maintenance-friendly.

## 4) Done criteria for each change

- Tests added or updated.
- Tests passing locally.
- Documentation updated (README/docs) when behavior changes.
- No new lint errors introduced.

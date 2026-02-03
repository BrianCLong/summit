# Discovery Notes: Consolidated Frontend

## Findings

*   **Path:** `client/` directory contains the React/Vite frontend.
*   **Start Command:** `npm run dev` (root) starts both server and client concurrently.
    *   Client runs on `http://localhost:3000`.
    *   Server runs on `http://localhost:4000`.
*   **Existing E2E:**
    *   Root `playwright.config.ts` exists, pointing to `e2e/`.
    *   `client/` has `cypress` config but `package.json` favors `playwright test`.
    *   Existing `e2e/golden-path.spec.ts` provides a template for the flow.

## Recommended Configuration

*   **CONSOLIDATED_FRONTEND_DIR:** `client`
*   **FRONTEND_START_CMD:** `npm run dev`
*   **BASE_URL:** `http://localhost:3000`
*   **Auth Bypass:** `/maestro/auth/callback?code=mock_code&state=mock_state` (found in existing tests).

## Test Data

*   Existing tests reference "Golden Path Investigation" and seeded entities.
*   We should rely on `npm run db:seed` or similar if available, or assume the environment is seeded.

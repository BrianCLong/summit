import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl:
      process.env.WEBAPP_BASE_URL ||
      `http://localhost:${process.env.WEBAPP_PORT || 5173}`,
    specPattern: 'cypress/e2e/**/*.cy.{ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
  },
});

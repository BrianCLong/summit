import { test, expect } from '../fixtures/auth.fixture';

test.describe('ZK Deconfliction', () => {
  test('should initiate ZK deconfliction session', async ({ zkPage }) => {
    await zkPage.goto();
    await zkPage.initiateDeconfliction();
    // Wait for process to complete (network idle implies API done)
    await zkPage.page.waitForLoadState('networkidle');
  });

  test('should perform private set intersection without revealing data', async ({ zkPage }) => {
    await zkPage.goto();
    await zkPage.verifyPrivacyPreserved();
  });

  test('should display intersection results securely', async ({ zkPage }) => {
    await zkPage.goto();
    await zkPage.initiateDeconfliction();
    await zkPage.verifyIntersectionResult();
  });
});

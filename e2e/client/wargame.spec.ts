import { test, expect } from '@playwright/test';

test.describe('WarGamed Decision Support Dashboard E2E Tests', () => {
  test('should allow user to run a simulation and view results', async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('http://localhost:3000/wargame-dashboard'); // Assuming client runs on port 3000

    // Expect the warning message to be visible
    await expect(page.getByText('WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'WarGamed Decision Support Dashboard' })).toBeVisible();

    // Fill out the scenario input form
    await page.getByLabel('Crisis Type').selectOption('geopolitical_conflict');
    await page.getByLabel('Target Audiences').fill('allies');
    await page.keyboard.press('Enter');
    await page.getByLabel('Target Audiences').fill('neutrals');
    await page.keyboard.press('Enter');

    await page.getByLabel('Key Narratives').fill('disinformation_campaigns');
    await page.keyboard.press('Enter');
    await page.getByLabel('Key Narratives').fill('unity_messaging');
    await page.keyboard.press('Enter');

    await page.getByLabel('Adversary Profiles').fill('state_actor_X');
    await page.keyboard.press('Enter');

    await page.getByLabel('Custom Simulation Parameters (JSON)').fill('{"durationDays": 7, "intensity": "high"}');

    // Click the "Run War-Game Simulation" button
    await page.getByRole('button', { name: 'Run War-Game Simulation' }).click();

    // Expect a loading indicator or success message
    await expect(page.getByRole('progressbar')).toBeVisible(); // CircularProgress
    await expect(page.getByRole('progressbar')).not.toBeVisible({ timeout: 30000 }); // Wait for simulation to complete

    // After simulation, expect the tabs to be visible and Telemetry tab to be selected
    await expect(page.getByRole('tab', { name: 'Telemetry' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Telemetry' })).toHaveAttribute('aria-selected', 'true');

    // Verify Telemetry data
    await expect(page.getByText('Live Social Media Telemetry')).toBeVisible();
    await expect(page.getByText('WAR-GAMED SIMULATION - Data displayed here is simulated')).toBeVisible();
    await expect(page.locator('.MuiDataGrid-row')).toHaveCount(1); // Expect at least one row of telemetry data

    // Switch to Adversary Intent tab
    await page.getByRole('tab', { name: 'Adversary Intent' }).click();
    await expect(page.getByRole('tab', { name: 'Adversary Intent' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Adversary Intent Estimation')).toBeVisible();
    await expect(page.getByText('WAR-GAMED SIMULATION - Intent estimates are hypothetical')).toBeVisible();
    await expect(page.getByRole('heading', { name: /High likelihood of disinformation escalation/ })).toBeVisible();

    // Switch to Narrative Heatmap tab
    await page.getByRole('tab', { name: 'Narrative Heatmap' }).click();
    await expect(page.getByRole('tab', { name: 'Narrative Heatmap' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Narrative Heatmaps')).toBeVisible();
    await expect(page.getByText('WAR-GAMED SIMULATION - Visualizations are based on simulated data')).toBeVisible();
    await expect(page.locator('.cytoscape-container')).toBeVisible(); // Check for Cytoscape container

    // Switch to Strategic Playbooks tab
    await page.getByRole('tab', { name: 'Strategic Playbooks' }).click();
    await expect(page.getByRole('tab', { name: 'Strategic Playbooks' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Strategic Response Playbooks')).toBeVisible();
    await expect(page.getByText('WAR-GAMED SIMULATION - Playbooks are theoretical')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Counter-Narrative Playbook/ })).toBeVisible();
  });

  test('should allow selecting an existing scenario', async ({ page }) => {
    // First, run a simulation to create a scenario
    await page.goto('http://localhost:3000/wargame-dashboard');
    await page.getByLabel('Crisis Type').selectOption('cyber_attack');
    await page.getByLabel('Target Audiences').fill('domestic_population');
    await page.keyboard.press('Enter');
    await page.getByLabel('Key Narratives').fill('threat_mitigation');
    await page.keyboard.press('Enter');
    await page.getByLabel('Adversary Profiles').fill('insider_threat_Z');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Run War-Game Simulation' }).click();
    await expect(page.getByRole('progressbar')).not.toBeVisible({ timeout: 30000 });

    // Navigate back to the dashboard (or refresh)
    await page.reload();
    await expect(page.getByRole('heading', { name: 'WarGamed Decision Support Dashboard' })).toBeVisible();

    // Select the newly created scenario from the dropdown
    await page.getByLabel('Select Existing Scenario').click();
    await page.getByRole('option', { name: /cyber_attack/ }).click();

    // Expect the tabs to be visible, indicating a scenario is selected
    await expect(page.getByRole('tab', { name: 'Telemetry' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Telemetry' })).toHaveAttribute('aria-selected', 'true');
  });
});

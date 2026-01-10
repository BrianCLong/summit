import path from 'path';
import { RedTeamHarness } from '../src/redteam/RedTeamHarness.js';
import { RedTeamPlanLoader } from '../src/redteam/RedTeamPlanLoader.js';
import { DEFAULT_DETECTION_RULES, DEFAULT_SCENARIOS } from '../src/redteam/defaults.js';
import { ConfigLoader } from '../src/utils/ConfigLoader.js';

describe('RedTeamHarness', () => {
  it('blocks prompt injection probes using default detection rules', async () => {
    const harness = new RedTeamHarness({
      ...ConfigLoader.getDefaults(),
      redteam: {
        outputDir: './sim-harness/.tmp/redteam',
        defaultDetectionRules: DEFAULT_DETECTION_RULES,
        persistArtifacts: false,
      },
    });

    const scenario = DEFAULT_SCENARIOS[0];
    const result = await harness.runScenario(scenario);

    expect(result.probes.length).toBeGreaterThan(0);
    expect(result.probes[0].detections.some((d) => d.triggered)).toBe(true);
    expect(result.probes.every((probe) => probe.blocked)).toBe(true);
    expect(result.passed).toBe(true);
  });

  it('loads scenarios and detection rules from plan file', () => {
    const planPath = path.resolve(
      process.cwd(),
      'sim-harness/config/redteam.default.yaml'
    );

    const plan = RedTeamPlanLoader.load(planPath);

    expect(plan.scenarios.length).toBeGreaterThan(0);
    expect(plan.detectionRules && plan.detectionRules.length).toBeGreaterThan(0);
    expect(plan.outputDir).toBe('./reports/redteam');
  });
});

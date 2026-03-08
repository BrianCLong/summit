/** @jest-environment node */
import { ReleaseOrchestrator } from '../../src/release/ReleaseOrchestrator';

const deterministicBuildResult = {
  success: true,
  executionTime: 10,
  cacheHit: true,
  dataLocalityMetrics: {
    cacheHitRate: 1,
    dataTransferBytes: 1024,
    executionTimeMs: 10,
    networkLatencyMs: 1,
    storageLocalityScore: 1,
  },
};

describe('ReleaseOrchestrator schema change guardrails', () => {
  it('blocks promotion when a schema validation fails', async () => {
    const orchestrator = new ReleaseOrchestrator();
    (orchestrator as any).executeRemoteBuild = jest
      .fn()
      .mockResolvedValue(deterministicBuildResult);

    const promotion = await orchestrator.promoteArtifact(
      'service-with-schema-drift',
      'dev',
      'staging',
      {
        repository: 'https://example.com/repo.git',
        entryPoint: 'npm run build',
        schemaChangePlan: {
          id: 'schema-plan-failing',
          description: 'Introduce failure during pre-flight checks',
          migrations: ['001_add_table.sql'],
          preflightChecks: [
            {
              name: 'Validate backward compatibility contract tests',
              command: 'npm run contract-tests',
              expectedOutcome: 'failed',
              critical: true,
            },
          ],
          postMigrationValidations: [
            {
              name: 'Verify replication lag thresholds',
              command: 'npm run check-replication',
            },
          ],
        },
      },
    );

    expect(promotion.success).toBe(false);
    expect(promotion.schemaValidation?.status).toBe('failed');
    expect(promotion.schemaValidation?.blockedDeployment).toBe(true);
    expect(
      promotion.schemaValidation?.preflight.some(
        (check) => check.status === 'failed',
      ),
    ).toBe(true);

    const report = await orchestrator.generateReleaseReport();
    expect(report.schemaValidation.totalPlans).toBe(1);
    expect(report.schemaValidation.failedPlans).toBe(1);
    expect(report.schemaValidation.lastRun?.planId).toBe('schema-plan-failing');
    expect(report.schemaValidation.validationHistory).toHaveLength(1);
    expect(report.schemaValidation.validationHistory[0].blockedDeployment).toBe(
      true,
    );
  });

  it('records successful schema validations into the release report', async () => {
    const orchestrator = new ReleaseOrchestrator();
    (orchestrator as any).executeRemoteBuild = jest
      .fn()
      .mockResolvedValue(deterministicBuildResult);

    const promotion = await orchestrator.promoteArtifact('service-ready', 'dev', 'staging', {
      repository: 'https://example.com/repo.git',
      entryPoint: 'npm run build',
      schemaChangePlan: {
        id: 'schema-plan-success',
        description: 'Safe additive change',
        migrations: ['002_add_column.sql'],
        preflightChecks: [
          {
            name: 'Run migration dry-run against shadow database',
            command: 'npm run migrate:shadow',
          },
        ],
        postMigrationValidations: [
          {
            name: 'Validate indexes and constraints',
            command: 'npm run validate:indexes',
          },
        ],
      },
    });

    expect(promotion.success).toBe(true);
    expect(promotion.schemaValidation?.status).toBe('passed');

    const report = await orchestrator.generateReleaseReport();
    expect(report.schemaValidation.totalPlans).toBe(1);
    expect(report.schemaValidation.passedPlans).toBe(1);
    expect(report.schemaValidation.lastRun?.planId).toBe('schema-plan-success');
    expect(
      report.schemaValidation.lastRun?.postMigration.every(
        (check) => check.status === 'passed',
      ),
    ).toBe(true);
    expect(report.schemaValidation.validationHistory).toHaveLength(1);
    expect(report.schemaValidation.validationHistory[0].summary).toContain(
      'Schema change guardrails satisfied',
    );
  });
});

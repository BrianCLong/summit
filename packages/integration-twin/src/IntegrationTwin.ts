import { Connector, ConnectorContext } from '../../connector-sdk/src';
import { DiffGenerator, Diff } from './DiffGenerator';

export class IntegrationTwin {
  private diffGenerator: DiffGenerator;

  constructor() {
    this.diffGenerator = new DiffGenerator();
  }

  async simulate(
    connector: Connector,
    toolName: string,
    args: any,
    context: ConnectorContext
  ): Promise<Diff> {
    if (!connector.dryRun) {
        // Fallback if dryRun is not supported?
        // Or throw error because safety is paramount.
        // For now, return a warning diff.
        return {
            description: `Connector ${connector.manifest.name} does not support dry-run. Execution would proceed blindly.`,
            changes: [],
            riskLevel: 'high'
        };
    }

    try {
      const dryRunResult = await connector.dryRun(toolName, args, context);
      return this.diffGenerator.generate(dryRunResult);
    } catch (error: any) {
      return {
        description: `Dry run failed: ${error.message}`,
        changes: [],
        riskLevel: 'high'
      };
    }
  }
}

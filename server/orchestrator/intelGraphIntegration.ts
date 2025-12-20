import { Run } from './types';
import { logger } from '../utils/logger';

// Mock implementation of IntelGraph client
export class IntelGraphClient {
  async createDecisionNode(run: Run): Promise<string> {
    logger.info(`[IntelGraph] Creating Decision node for run ${run.id}`, {
      type: run.type,
      metadata: run.metadata
    });
    // Return a fake IntelGraph ID
    return `ig-decision-${run.id}`;
  }

  async attachEvidence(decisionId: string, evidence: any): Promise<void> {
    logger.info(`[IntelGraph] Attaching evidence to ${decisionId}`, evidence);
  }

  async updateStatus(decisionId: string, status: string): Promise<void> {
    logger.info(`[IntelGraph] Updating status of ${decisionId} to ${status}`);
  }
}

const igClient = new IntelGraphClient();

export async function recordRunInIntelGraph(run: Run) {
  try {
    const decisionId = await igClient.createDecisionNode(run);

    if (run.input) {
      await igClient.attachEvidence(decisionId, {
        type: 'input',
        data: run.input
      });
    }

    if (run.output) {
      await igClient.attachEvidence(decisionId, {
        type: 'output',
        data: run.output
      });
    }

    for (const artifact of run.artifacts) {
      await igClient.attachEvidence(decisionId, {
        type: 'artifact',
        ...artifact
      });
    }

    return decisionId;
  } catch (error) {
    logger.error('Failed to record run in IntelGraph', error);
    // We don't want to fail the run if reporting fails, just log it
    return null;
  }
}

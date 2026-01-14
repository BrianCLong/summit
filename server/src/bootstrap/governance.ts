import { generateEvidence } from '../governance/evidence_generator';
import { logger } from '../utils/logger';

export async function bootstrapGovernance() {
  try {
    logger.info('Bootstrapping Governance Runtime Evidence...');
    await generateEvidence();
    logger.info('Governance Runtime Evidence generated successfully.');
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate Governance Runtime Evidence on boot');
    // We don't fail hard here to avoid crash loops, but it is logged as error.
    // In strict environments, this should be fatal.
    if (process.env.STRICT_GOVERNANCE === 'true') {
        throw error;
    }
  }
}

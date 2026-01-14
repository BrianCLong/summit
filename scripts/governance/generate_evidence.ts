// Helper script to run evidence generation manually
import { generateEvidence } from '../../server/src/governance/evidence_generator';
import { logger } from '../../server/src/utils/logger';

generateEvidence().catch(err => {
    logger.error(err);
    process.exit(1);
});

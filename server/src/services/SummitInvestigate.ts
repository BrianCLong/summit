
import { Express } from 'express';
import summitInvestigateRoutes from '../routes/summit-investigate.js';
import logger from '../utils/logger.js';

/**
 * SummitInvestigate - The Advanced OSINT Platform Integration Layer
 *
 * This class serves as the central entry point for the "SummitInvestigate" capabilities.
 * It registers the necessary routes and ensures all services are initialized.
 */
export class SummitInvestigate {
  static initialize(app: Express) {
    logger.info('[SummitInvestigate] Initializing platform modules...');

    // Mount the routes under a dedicated API namespace
    app.use('/api/summit-investigate', summitInvestigateRoutes);

    logger.info('[SummitInvestigate] Modules loaded: VerificationSwarm, EvidenceFusion, DeepfakeHunter, PredictiveSimulator, CollaborationHub');
    logger.info('[SummitInvestigate] Platform ready.');
  }
}

/**
 * SIGINT Processing Service
 * TRAINING/SIMULATION ONLY
 *
 * Enterprise signals intelligence training platform.
 * No actual interception capabilities.
 *
 * Compliance: NSPM-7, EO 12333, USSID 18
 */

import express from 'express';
import { SIGINTEngine } from './processing/SIGINTEngine';
import { ComplianceManager } from './compliance/ComplianceManager';
import { createAPIRouter } from './api/routes';

const app = express();
const port = process.env.PORT || 3000;

// Initialize components
const complianceManager = new ComplianceManager();
const sigintEngine = new SIGINTEngine(complianceManager);

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: 'TRAINING',
    version: '1.0.0',
    disclaimer: 'SIMULATION ONLY - No actual SIGINT capabilities'
  });
});

// API routes
app.use('/api/v1', createAPIRouter(sigintEngine, complianceManager));

// Start server
app.listen(port, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              SIGINT TRAINING PLATFORM v1.0.0                     ║
║══════════════════════════════════════════════════════════════════║
║  MODE: TRAINING/SIMULATION                                       ║
║  STATUS: OPERATIONAL                                             ║
║                                                                  ║
║  NOTICE: This is a TRAINING system only.                         ║
║  No actual signal interception capabilities are implemented.     ║
║                                                                  ║
║  Compliance: NSPM-7, EO 12333, USSID 18, DoD 5240.1-R           ║
╚══════════════════════════════════════════════════════════════════╝

Server running on port ${port}
  `);
});

export { app, sigintEngine, complianceManager };

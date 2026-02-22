/**
 * One-time bootstrap wiring for AI module:
 * - Express route (webhook)
 * - Start approved-insight writer
 * - Initialize Redis caching
 * - Setup audit logging
 */
import aiWebhook from '../routes/aiWebhook';
import { startApprovedWriter } from '../workers/approvedWriter';
import { setupAICaching } from './caching';
import { setupAIAuditLogging } from './auditLogging';

export function installAI(app: any, container: any) {
  // Ensure raw-body capture middleware exists upstream (see note in README)
  app.use(aiWebhook);

  // Initialize AI caching layer
  if (container.redis) {
    setupAICaching(container.redis);
  }

  // Setup comprehensive audit logging
  setupAIAuditLogging(container.db);

  // Start background writer for approved insights
  startApprovedWriter(container.db, container.neo4j).catch((error) => {
    console.error('Failed to start approved writer:', error);
  });

  console.log('IntelGraph AI module installed successfully');
}

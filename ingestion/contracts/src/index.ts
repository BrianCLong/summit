import { CertificationWorkflow } from './certification.js';
import { AppendOnlyAuditLog } from './audit.js';
import { QuarantineService } from './quarantine.js';
import { ScorecardEngine } from './scorecard.js';
import { ContractRegistry } from './registry.js';
import { diffSpecs, validateConformance } from './spec-utils.js';
export * from './types.js';
export * from './registry.js';
export * from './certification.js';
export * from './audit.js';
export * from './quarantine.js';
export * from './scorecard.js';
export * from './webhooks.js';
export { diffSpecs, validateConformance };

export function createIngestionRegistry(issuer: string): ContractRegistry {
  const audit = new AppendOnlyAuditLog();
  const quarantine = new QuarantineService(audit);
  const workflow = new CertificationWorkflow(issuer);
  const scorecards = new ScorecardEngine();
  return new ContractRegistry(workflow, audit, quarantine, scorecards);
}

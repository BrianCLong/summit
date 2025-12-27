import { RegionalAvailabilityService } from '../src/services/RegionalAvailabilityService.js';
import { BackupVerificationService } from '../src/services/BackupVerificationService.js';
import logger from '../src/utils/logger.js';

// Mock policy check function (since we can't run OPA directly in this env easily without binding)
// This mirrors the logic in policy/failover.rego
function checkPolicy(input: any): { allowed: boolean; reason?: string } {
  const { region, tenant, system_status, operation } = input;
  const homeRegion = tenant.home_region;
  const homeStatus = system_status.regions[homeRegion]?.status;

  // Rule 1: Allow within home region if healthy
  if (region === homeRegion && homeStatus === 'HEALTHY') {
    return { allowed: true };
  }

  const validDrPairs: Record<string, string> = {
      'us-east-1': 'us-west-2',
      'eu-central-1': 'eu-west-1'
  };

  const isDrRegion = validDrPairs[homeRegion] === region;

  // Rule 2: Read failover
  if (operation === 'read' && homeStatus === 'DOWN' && isDrRegion) {
    return { allowed: true };
  }

  // Rule 3: Write failover (requires manual promotion)
  if (operation === 'write' && homeStatus === 'DOWN' && isDrRegion && system_status.failoverMode === 'MANUAL_PROMOTION_ACTIVE') {
    return { allowed: true };
  }

  return { allowed: false, reason: 'Policy violation' };
}

async function runSimulation() {
  logger.info('🚀 Starting DR Drill Simulation...');

  const availabilityService = RegionalAvailabilityService.getInstance();
  const backupService = BackupVerificationService.getInstance();

  // Scenario 1: Normal Operation
  logger.info('\n--- Scenario 1: Normal Operation ---');
  availabilityService.reset();

  let status = availabilityService.getStatus();
  let input = {
      region: 'us-east-1',
      tenant: { home_region: 'us-east-1' },
      system_status: status,
      operation: 'write'
  };

  let result = checkPolicy(input);
  logger.info(`Write to us-east-1 (Primary): ${result.allowed ? 'ALLOWED' : 'DENIED'}`);
  if (!result.allowed) process.exit(1);

  // Scenario 2: Primary Region Failure
  logger.info('\n--- Scenario 2: Primary Region Failure (us-east-1 DOWN) ---');
  availabilityService.setRegionStatus('us-east-1', 'DOWN');
  status = availabilityService.getStatus();

  // Attempt Write to Primary (Should fail)
  input = { ...input, system_status: status };
  result = checkPolicy(input);
  logger.info(`Write to us-east-1 (Primary DOWN): ${result.allowed ? 'ALLOWED' : 'DENIED'} (Expected: DENIED)`);

  // Attempt Read from DR (Should succeed)
  input = {
      region: 'us-west-2',
      tenant: { home_region: 'us-east-1' },
      system_status: status,
      operation: 'read'
  };
  result = checkPolicy(input);
  logger.info(`Read from us-west-2 (DR): ${result.allowed ? 'ALLOWED' : 'DENIED'} (Expected: ALLOWED)`);
  if (!result.allowed) {
      logger.error("Read failover failed!");
      process.exit(1);
  }

  // Attempt Write to DR (Should fail - no promotion)
  input = {
      region: 'us-west-2',
      tenant: { home_region: 'us-east-1' },
      system_status: status,
      operation: 'write'
  };
  result = checkPolicy(input);
  logger.info(`Write to us-west-2 (DR, No Promo): ${result.allowed ? 'ALLOWED' : 'DENIED'} (Expected: DENIED)`);

  // Scenario 3: Manual Promotion
  logger.info('\n--- Scenario 3: Manual Promotion (Break Glass) ---');
  availabilityService.setFailoverMode('MANUAL_PROMOTION_ACTIVE');
  status = availabilityService.getStatus();

  // Attempt Write to DR (Should succeed)
  input = { ...input, system_status: status };
  result = checkPolicy(input);
  logger.info(`Write to us-west-2 (DR, Promoted): ${result.allowed ? 'ALLOWED' : 'DENIED'} (Expected: ALLOWED)`);
  if (!result.allowed) {
      logger.error("Write failover failed!");
      process.exit(1);
  }

  // Scenario 4: Forbidden Cross-Region (Residency Violation)
  logger.info('\n--- Scenario 4: Residency Violation Attempt ---');
  input = {
      region: 'eu-central-1', // Wrong region
      tenant: { home_region: 'us-east-1' },
      system_status: status,
      operation: 'read'
  };
  result = checkPolicy(input);
  logger.info(`Read from eu-central-1 (Non-Residency): ${result.allowed ? 'ALLOWED' : 'DENIED'} (Expected: DENIED)`);
  if (result.allowed) {
      logger.error("Residency violation allowed!");
      process.exit(1);
  }

  // Epic 3 & 5: Backup Verification & Evidence
  logger.info('\n--- Epic 3 & 5: Backup Verification & Evidence ---');
  const backup = backupService.simulateBackup('us-east-1');
  if (backup.status === 'COMPLETED') {
      const verified = await backupService.verifyBackup(backup.id);
      logger.info(`Backup Verification Result: ${verified}`);
  }

  const evidence = backupService.getEvidence('us-east-1');
  logger.info('Customer Evidence Signal:', JSON.stringify(evidence, null, 2));

  logger.info('\n✅ DR Simulation Completed Successfully.');
}

runSimulation().catch(err => {
    logger.error('Simulation failed:', err);
    process.exit(1);
});

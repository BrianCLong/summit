
import {
  MultiRegionProber,
  RegionConfig,
  RegionSkewDetector,
  FailoverValidator,
  AutoRollbackMonitor,
  RollbackEngine
} from '../../server/src/lib/deployment/index.js';
import axios from 'axios';

// Mock implementation to replace axios for this script
const mockAxiosInstance = {
  get: async (url: string) => {
    // Simulate latency
    const latency = Math.floor(Math.random() * 100);
    await new Promise(resolve => setTimeout(resolve, latency));

    // Simulate failure for a specific URL
    if (url.includes('fail')) {
       throw new Error('Simulated Connection Failed');
    }
    return { status: 200, data: { status: 'ok' } };
  }
};

const regions: RegionConfig[] = [
  { id: 'us-east-1', name: 'US East (N. Virginia)', endpoint: 'https://us-east-1.api.example.com/health' },
  { id: 'eu-west-1', name: 'EU West (Ireland)', endpoint: 'https://eu-west-1.api.example.com/health' },
  { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', endpoint: 'https://ap-northeast-1.api.example.com/health' },
];

async function main() {
  console.log('=== Multi-Region Health & Failover Validation Suite ===\n');

  // 1. Initialize Prober with a mock client
  // We bypass the actual axios.create by passing our mock instance directly if the class supports it.
  // The MultiRegionProber constructor signature is: constructor(regions: RegionConfig[], client?: AxiosInstance)
  // We cast our mock to any to satisfy TS for this script.
  const prober = new MultiRegionProber(regions, mockAxiosInstance as any);

  console.log('--- 1. Multi-Region Health Probe ---');
  const statuses = await prober.probeAll();
  console.table(statuses.map(s => ({
    Region: s.regionName,
    Healthy: s.isHealthy,
    Latency: `${s.latencyMs}ms`,
    Error: s.error || '-'
  })));

  // 2. Region Skew Detection
  console.log('\n--- 2. Region Skew Detection ---');
  const skewDetector = new RegionSkewDetector(200); // 200ms threshold
  const skewResult = skewDetector.detectLatencySkew(statuses);
  console.log(`Skew Detected: ${skewResult.detected}`);
  console.log(`Max Skew: ${skewResult.maxSkewMs}ms`);
  console.log(`Details: ${skewResult.details}`);

  // 3. Failover Validation
  console.log('\n--- 3. Failover Scenario Validator ---');
  const failoverValidator = new FailoverValidator(prober, 'us-east-1');
  const failoverResult = await failoverValidator.validateFailoverCapability();
  console.log(`Success: ${failoverResult.success}`);
  console.log(`Message: ${failoverResult.message}`);
  if(failoverResult.logs.length > 0) {
      console.log('Logs:');
      failoverResult.logs.forEach(l => console.log(`  - ${l}`));
  }

  // 4. Auto Rollback Monitor Check
  console.log('\n--- 4. Auto Rollback Monitor ---');
  const rollbackEngine = new RollbackEngine();
  const monitor = new AutoRollbackMonitor(
    'payment-service',
    rollbackEngine,
    prober,
    { errorRateThreshold: 0.05, latencyThresholdMs: 500, consecutiveFailures: 1 }
  );

  // Trigger a check
  const triggered = await monitor.checkAndTrigger();
  console.log(`Rollback Triggered: ${triggered}`);

  console.log('\n=== Suite Completed ===');
}

// Allow running directly
// In a real environment, we'd need to handle imports correctly (e.g. ts-node)
// Checking if this file is the main module being executed
// @ts-ignore
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch(console.error);
}

export { main };


import { BlueGreenDeployer, MockLoadBalancer, MockMonitoringService } from '../server/lib/deployment/blue-green-deployer.js';
import { NginxLoadBalancerAdapter } from '../server/lib/deployment/adapters/nginx-adapter.js';
import { RollbackEngine } from '../server/lib/deployment/rollback-engine.js';
import { SmokeTester } from '../server/lib/deployment/smoke-test.js';

// Setup Mock Environment
const serviceName = 'summit-api';
const stableVersion = 'v1.0.0';
const newVersion = 'v1.1.0';

async function runSuccessfulDeployment() {
    console.log('\n--- SCENARIO 1: Successful Zero-Downtime Deployment ---\n');

    // Use Nginx Adapter for demonstration (DryRun)
    const lb = new NginxLoadBalancerAdapter('/etc/nginx/conf.d/upstream.conf', true);
    const monitor = new MockMonitoringService();
    const rollback = new RollbackEngine();

    const deployer = new BlueGreenDeployer({
        serviceName,
        stableVersion,
        newVersion,
        healthCheckUrl: 'http://localhost:3000/health',
        smokeTestUrl: 'http://localhost:3000',
        healthTimeout: 30
    }, lb, monitor, rollback);

    // Initial State
    await lb.setTraffic(serviceName, stableVersion, 100);

    const success = await deployer.deploy(newVersion);
    if (success) {
        console.log(`\n✅ Deployment of ${newVersion} completed successfully!`);
    } else {
        console.error(`\n❌ Deployment of ${newVersion} failed.`);
    }
}

async function runFailedDeployment() {
    console.log('\n--- SCENARIO 2: Failed Deployment with Auto-Rollback ---\n');

    const lb = new NginxLoadBalancerAdapter('/etc/nginx/conf.d/upstream.conf', true);

    // Inject Faulty Monitor
    const faultyMonitor = {
        getHealth: async (service, version) => {
            console.log(`[FaultyMonitor] Checking ${service}:${version}`);
            if (version === 'v1.2.0-broken') {
                console.log(`[FaultyMonitor] Detected High Error Rate!`);
                return { healthy: false, errorRate: 0.15, latency: 1200 };
            }
            return { healthy: true, errorRate: 0.0, latency: 100 };
        }
    };

    const rollback = new RollbackEngine();

    const deployer = new BlueGreenDeployer({
        serviceName,
        stableVersion: newVersion, // Previous new is now stable
        newVersion: 'v1.2.0-broken',
        healthCheckUrl: 'http://localhost:3000/health',
        healthTimeout: 30
    }, lb, faultyMonitor, rollback);

    // Initial State
    await lb.setTraffic(serviceName, newVersion, 100);

    const success = await deployer.deploy('v1.2.0-broken');
    if (success) {
        console.log(`\n❌ Deployment of broken version SHOULD have failed but succeeded.`);
    } else {
        console.log(`\n✅ Deployment failed as expected and rolled back.`);
    }
}

(async () => {
    try {
        await runSuccessfulDeployment();
        await runFailedDeployment();
    } catch (e) {
        console.error(e);
    }
})();

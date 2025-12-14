
import { AppFactory } from '../../appFactory.js';
import { TenantValidator } from '../../middleware/tenantValidator.js';

// This is a standalone simulation engine script, distinct from the Jest test.
// It is intended to be run against a live server or in a stress-test scenario.

const runSimulation = async () => {
    console.log("Starting Tenant Boundary Leak Simulation Engine...");

    const tenantA = 'tenant-a-' + Date.now();
    const tenantB = 'tenant-b-' + Date.now();

    console.log(`Simulating traffic between ${tenantA} and ${tenantB}`);

    // Simulation logic:
    // 1. Generate N concurrent requests
    // 2. Mix valid and invalid (cross-tenant) requests
    // 3. Measure success/failure rates

    const iterations = 100;
    const errors: string[] = [];

    // Simulate checks (mocking the app logic for this script as we assume no live server running on this port in CI)
    // In a real scenario, this would use fetch() to hit localhost:4000

    console.log(`Running ${iterations} iterations...`);

    for (let i = 0; i < iterations; i++) {
        // Randomly decide if this is a cross-tenant attack
        const isAttack = Math.random() > 0.5;
        const targetTenant = isAttack ? tenantB : tenantA;
        const sourceTenant = tenantA;

        try {
             // Simulate middleware logic
             if (targetTenant !== sourceTenant) {
                 // Attack simulation
                 // We expect this to THROW
                 try {
                     // Using the internal validator to simulate the check
                    TenantValidator.validateTenantAccess(
                        { user: { id: 'sim-user', tenantId: sourceTenant, roles: ['ANALYST'] } },
                        targetTenant,
                        { validateOwnership: true }
                    );
                    errors.push(`Iteration ${i}: Failed to block cross-tenant access from ${sourceTenant} to ${targetTenant}`);
                 } catch (e) {
                     // Expected behavior: Access denied
                 }
             } else {
                 // Valid access simulation
                 // We expect this to SUCCEED
                  TenantValidator.validateTenantAccess(
                        { user: { id: 'sim-user', tenantId: sourceTenant, roles: ['ANALYST'] } },
                        targetTenant,
                        { validateOwnership: true }
                    );
             }
        } catch (e) {
            if (targetTenant === sourceTenant) {
                errors.push(`Iteration ${i}: Failed valid access for ${sourceTenant}`);
            }
        }
    }

    if (errors.length > 0) {
        console.error("Simulation detected leaks or failures:");
        errors.forEach(e => console.error(e));
        process.exit(1);
    } else {
        console.log("Simulation complete. No leaks detected. All boundary checks passed.");
    }
};

if (import.meta.url === `file://${process.argv[1]}`) {
    runSimulation().catch(console.error);
}

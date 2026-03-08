"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const governance_1 = require("../src/governance");
(0, vitest_1.describe)('enforceGovernance', () => {
    (0, vitest_1.it)('enforces data residency and requests approvals for risky actions', () => {
        const { controls, approvals } = (0, governance_1.enforceGovernance)({
            dataResidency: 'eu',
            approvedRegions: ['us'],
            integrationAllowlists: ['snowflake'],
            requestedIntegration: 'salesforce',
            riskyActionRequested: 'bypass-retention'
        });
        const residencyControl = controls.find((c) => c.control === 'data-residency');
        (0, vitest_1.expect)(residencyControl?.enforced).toBe(false);
        const integrationControl = controls.find((c) => c.control === 'integration-governance');
        (0, vitest_1.expect)(integrationControl?.enforced).toBe(false);
        (0, vitest_1.expect)(approvals[0].requiresApproval).toBe(true);
    });
});

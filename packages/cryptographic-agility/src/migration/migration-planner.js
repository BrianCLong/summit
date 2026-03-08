"use strict";
/**
 * Migration Planner
 * Plans and tracks cryptographic algorithm migrations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationPlanner = void 0;
exports.createMigrationPlanner = createMigrationPlanner;
class MigrationPlanner {
    plans = new Map();
    createPlan(source, target) {
        const plan = {
            id: this.generateId(),
            name: `Migrate ${source} to ${target}`,
            sourceAlgorithm: source,
            targetAlgorithm: target,
            priority: this.calculatePriority(source, target),
            estimatedDuration: this.estimateDuration(source, target),
            dependencies: [],
            rollbackStrategy: this.generateRollbackStrategy(source, target),
            validationCriteria: this.generateValidationCriteria(target),
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.plans.set(plan.id, plan);
        return plan;
    }
    updatePlan(planId, updates) {
        const plan = this.plans.get(planId);
        if (!plan) {
            throw new Error(`Migration plan ${planId} not found`);
        }
        Object.assign(plan, updates);
        plan.updatedAt = new Date();
    }
    getPlan(planId) {
        return this.plans.get(planId);
    }
    listPlans(status) {
        const allPlans = Array.from(this.plans.values());
        if (!status) {
            return allPlans;
        }
        return allPlans.filter(plan => plan.status === status);
    }
    async validatePlan(planId) {
        const plan = this.plans.get(planId);
        if (!plan) {
            return false;
        }
        // Check dependencies
        for (const depId of plan.dependencies) {
            const dep = this.plans.get(depId);
            if (!dep || dep.status !== 'completed') {
                return false;
            }
        }
        // Validate rollback strategy exists
        if (!plan.rollbackStrategy) {
            return false;
        }
        // Validate criteria exists
        if (plan.validationCriteria.length === 0) {
            return false;
        }
        return true;
    }
    assessQuantumRisk(assetId, currentAlgorithm, dataRetentionYears) {
        const quantumVulnerable = this.isQuantumVulnerable(currentAlgorithm);
        const timeToQuantumThreat = 10; // Conservative estimate: 10 years
        const cryptographicLifetime = this.getCryptographicLifetime(currentAlgorithm);
        const harvestNowDecryptLaterRisk = this.calculateHarvestRisk(quantumVulnerable, dataRetentionYears, timeToQuantumThreat);
        const migrationUrgency = this.calculateMigrationUrgency(harvestNowDecryptLaterRisk, timeToQuantumThreat, cryptographicLifetime);
        return {
            assetId,
            dataClassification: 'confidential', // Would be determined from asset metadata
            currentAlgorithm,
            quantumVulnerable,
            cryptographicLifetime,
            dataRetentionPeriod: dataRetentionYears,
            harvestNowDecryptLaterRisk,
            timeToQuantumThreat,
            migrationUrgency,
            recommendedActions: this.generateRecommendations(quantumVulnerable, harvestNowDecryptLaterRisk, migrationUrgency),
        };
    }
    generateId() {
        return `migration-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
    calculatePriority(source, target) {
        // Higher priority for quantum-vulnerable algorithms
        if (this.isQuantumVulnerable(source)) {
            return 90;
        }
        // Medium priority for deprecated algorithms
        if (this.isDeprecated(source)) {
            return 50;
        }
        // Low priority for approved algorithms
        return 10;
    }
    estimateDuration(source, target) {
        // Estimate in hours based on algorithm complexity
        const complexityMap = {
            'RSA': 40,
            'ECDSA': 30,
            'AES': 20,
            'Kyber': 50,
            'Dilithium': 50,
            'FALCON': 60,
            'SPHINCS+': 45,
        };
        const sourceComplexity = complexityMap[source] || 40;
        const targetComplexity = complexityMap[target] || 40;
        return sourceComplexity + targetComplexity;
    }
    generateRollbackStrategy(source, target) {
        return `
1. Maintain parallel implementation of both ${source} and ${target}
2. Implement feature flag to switch between algorithms
3. Monitor error rates and performance metrics
4. If issues detected:
   a. Switch feature flag back to ${source}
   b. Investigate and fix issues
   c. Re-validate ${target} implementation
5. Keep ${source} implementation for 90 days after successful migration
6. Document rollback procedure and test quarterly
    `.trim();
    }
    generateValidationCriteria(target) {
        return [
            'All unit tests pass with new algorithm',
            'Integration tests validate end-to-end functionality',
            'Performance benchmarks meet requirements',
            'Security audit completed and approved',
            'Backward compatibility verified',
            'Key generation produces valid keys',
            'Encryption/signing produces valid outputs',
            'Decryption/verification succeeds with correct inputs',
            'Decryption/verification fails with incorrect inputs',
            'Algorithm implementation matches specification',
            'No memory leaks detected',
            'Thread safety verified',
            'Error handling covers all edge cases',
        ];
    }
    isQuantumVulnerable(algorithm) {
        const vulnerable = ['RSA', 'ECDSA', 'ECDH', 'DSA', 'DH'];
        return vulnerable.some(v => algorithm.toUpperCase().includes(v));
    }
    isDeprecated(algorithm) {
        const deprecated = ['MD5', 'SHA1', 'DES', 'RC4'];
        return deprecated.some(d => algorithm.toUpperCase().includes(d));
    }
    getCryptographicLifetime(algorithm) {
        // Years until algorithm is considered insecure
        if (this.isQuantumVulnerable(algorithm)) {
            return 10; // Conservative estimate for quantum threat
        }
        if (this.isDeprecated(algorithm)) {
            return 0; // Already insecure
        }
        return 30; // Post-quantum algorithms
    }
    calculateHarvestRisk(quantumVulnerable, dataRetentionYears, timeToQuantumThreat) {
        if (!quantumVulnerable) {
            return 'low';
        }
        // If data retention extends beyond quantum threat timeline
        if (dataRetentionYears > timeToQuantumThreat) {
            return 'critical';
        }
        // If data retention is close to quantum threat timeline
        if (dataRetentionYears > timeToQuantumThreat * 0.7) {
            return 'high';
        }
        // If data retention is moderate
        if (dataRetentionYears > timeToQuantumThreat * 0.4) {
            return 'medium';
        }
        return 'low';
    }
    calculateMigrationUrgency(harvestRisk, timeToQuantumThreat, cryptographicLifetime) {
        if (harvestRisk === 'critical') {
            return 'immediate';
        }
        if (harvestRisk === 'high' || cryptographicLifetime < 5) {
            return 'high';
        }
        if (harvestRisk === 'medium' || cryptographicLifetime < 10) {
            return 'medium';
        }
        return 'low';
    }
    generateRecommendations(quantumVulnerable, harvestRisk, urgency) {
        const recommendations = [];
        if (quantumVulnerable) {
            recommendations.push('Migrate to post-quantum cryptography immediately');
            recommendations.push('Implement hybrid classical-quantum schemes for defense-in-depth');
        }
        if (harvestRisk === 'critical' || harvestRisk === 'high') {
            recommendations.push('Re-encrypt sensitive data with post-quantum algorithms');
            recommendations.push('Rotate keys using quantum-resistant algorithms');
            recommendations.push('Implement forward secrecy to limit exposure window');
        }
        if (urgency === 'immediate' || urgency === 'high') {
            recommendations.push('Prioritize migration in next sprint');
            recommendations.push('Allocate additional resources to accelerate migration');
            recommendations.push('Conduct security audit after migration');
        }
        recommendations.push('Monitor NIST PQC standardization updates');
        recommendations.push('Maintain cryptographic agility for future transitions');
        recommendations.push('Document migration process and lessons learned');
        return recommendations;
    }
}
exports.MigrationPlanner = MigrationPlanner;
function createMigrationPlanner() {
    return new MigrationPlanner();
}

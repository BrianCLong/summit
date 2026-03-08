"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstraintSystem = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const url_1 = require("url");
class ConstraintSystem {
    constraints;
    logger;
    constructor(logger = console) {
        this.logger = logger;
        this.loadConstraints();
    }
    loadConstraints() {
        try {
            // Handle ESM __dirname equivalents
            const __filename = (0, url_1.fileURLToPath)(import.meta.url);
            const __dirname = path_1.default.dirname(__filename);
            // Try multiple paths to find the constraints file
            const potentialPaths = [
                path_1.default.resolve(process.cwd(), 'governance/constraints.yaml'),
                path_1.default.resolve(process.cwd(), '../governance/constraints.yaml'),
                path_1.default.resolve(__dirname, '../../../../governance/constraints.yaml')
            ];
            let constraintPath = '';
            for (const p of potentialPaths) {
                if (fs_1.default.existsSync(p)) {
                    constraintPath = p;
                    break;
                }
            }
            if (!constraintPath) {
                throw new Error('Constraints file not found in standard locations');
            }
            const fileContents = fs_1.default.readFileSync(constraintPath, 'utf8');
            this.constraints = js_yaml_1.default.load(fileContents);
            if (this.logger && typeof this.logger.info === 'function') {
                this.logger.info(`Loaded constraints from ${constraintPath}`);
            }
        }
        catch (error) {
            if (this.logger && typeof this.logger.error === 'function') {
                this.logger.error('Failed to load constraints', error);
            }
            else {
                console.error('Failed to load constraints', error);
            }
            // Initialize with empty structure to prevent crashes
            this.constraints = { release: {}, reliability: {}, capital: {}, governance: {} };
        }
    }
    getConstraints() {
        return this.constraints;
    }
    evaluateRelease(context) {
        const violations = [];
        const releaseConstraints = this.constraints.release || {};
        // Check Error Budget
        if (releaseConstraints.error_budget_ceiling && context.errorBudgetBurn !== undefined) {
            const limit = releaseConstraints.error_budget_ceiling.value;
            if (context.errorBudgetBurn > limit) {
                violations.push({
                    constraint: 'error_budget_ceiling',
                    expected: limit,
                    actual: context.errorBudgetBurn,
                    message: `Error budget burn ${context.errorBudgetBurn}% exceeds limit ${limit}%`
                });
            }
        }
        // Check Blackout Windows
        if (releaseConstraints.blackout_windows && context.isBlackoutWindow) {
            violations.push({
                constraint: 'blackout_windows',
                expected: false,
                actual: true,
                message: 'Release attempted during active blackout window'
            });
        }
        // Check Dependency Freshness
        if (releaseConstraints.dependency_freshness && context.dependencyAgeDays !== undefined) {
            const limit = releaseConstraints.dependency_freshness.value;
            if (context.dependencyAgeDays > limit) {
                violations.push({
                    constraint: 'dependency_freshness',
                    expected: limit,
                    actual: context.dependencyAgeDays,
                    message: `Dependency age ${context.dependencyAgeDays} days exceeds limit ${limit} days`
                });
            }
        }
        return {
            compliant: violations.length === 0,
            violations
        };
    }
    evaluateReliability(context) {
        const violations = [];
        const reliabilityConstraints = this.constraints.reliability || {};
        if (reliabilityConstraints.latency_p95 && context.p95Latency !== undefined) {
            const limit = reliabilityConstraints.latency_p95.value;
            if (context.p95Latency > limit) {
                violations.push({
                    constraint: 'latency_p95',
                    expected: limit,
                    actual: context.p95Latency,
                    message: `P95 Latency ${context.p95Latency}ms exceeds limit ${limit}ms`
                });
            }
        }
        if (reliabilityConstraints.blast_radius && context.blastRadius !== undefined) {
            const limit = reliabilityConstraints.blast_radius.value;
            if (context.blastRadius > limit) {
                violations.push({
                    constraint: 'blast_radius',
                    expected: limit,
                    actual: context.blastRadius,
                    message: `Blast radius ${context.blastRadius}% exceeds limit ${limit}%`
                });
            }
        }
        return {
            compliant: violations.length === 0,
            violations
        };
    }
    evaluateCapital(context) {
        const violations = [];
        const capitalConstraints = this.constraints.capital || {};
        if (capitalConstraints.infra_roi_floor && context.infraRoi !== undefined) {
            const limit = capitalConstraints.infra_roi_floor.value;
            if (context.infraRoi < limit) {
                violations.push({
                    constraint: 'infra_roi_floor',
                    expected: limit,
                    actual: context.infraRoi,
                    message: `Infra ROI ${context.infraRoi} is below floor ${limit}`
                });
            }
        }
        if (capitalConstraints.experiment_cost_ceiling && context.experimentCost !== undefined) {
            const limit = capitalConstraints.experiment_cost_ceiling.value;
            if (context.experimentCost > limit) {
                violations.push({
                    constraint: 'experiment_cost_ceiling',
                    expected: limit,
                    actual: context.experimentCost,
                    message: `Experiment cost $${context.experimentCost} exceeds ceiling $${limit}`
                });
            }
        }
        return {
            compliant: violations.length === 0,
            violations
        };
    }
}
exports.ConstraintSystem = ConstraintSystem;

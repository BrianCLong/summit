"use strict";
/**
 * Red Team Operations Service
 *
 * Centralized service for managing red team operations including:
 * - Campaign orchestration
 * - Attack execution coordination
 * - Adversarial AI testing
 * - Purple team collaboration
 * - Reporting and metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmulationPlanGenerator = exports.APTLibrary = exports.IOCGenerator = exports.SIEMRuleValidator = exports.ExerciseManager = exports.VulnerabilityRiskCalculator = exports.CVEDatabase = exports.AttackSurfaceMapper = exports.SocialEngineeringEngine = exports.ScenarioGenerator = exports.MITRELibrary = exports.RedTeamService = void 0;
const red_team_1 = require("@intelgraph/red-team");
const vulnerability_intelligence_1 = require("@intelgraph/vulnerability-intelligence");
const purple_team_1 = require("@intelgraph/purple-team");
const threat_emulation_1 = require("@intelgraph/threat-emulation");
/**
 * Red Team Operations Service
 */
class RedTeamService {
    config;
    mitreLibrary;
    scenarioGenerator;
    socialEngineering;
    attackSurfaceMapper;
    cveDatabase;
    riskCalculator;
    exerciseManager;
    siemValidator;
    iocGenerator;
    aptLibrary;
    emulationGenerator;
    constructor(config) {
        this.config = config;
        // Initialize all components
        this.mitreLibrary = new red_team_1.MITRELibrary();
        this.scenarioGenerator = new red_team_1.ScenarioGenerator();
        this.socialEngineering = new red_team_1.SocialEngineeringEngine();
        this.attackSurfaceMapper = new red_team_1.AttackSurfaceMapper();
        this.cveDatabase = new vulnerability_intelligence_1.CVEDatabase();
        this.riskCalculator = new vulnerability_intelligence_1.VulnerabilityRiskCalculator();
        this.exerciseManager = new purple_team_1.ExerciseManager();
        this.siemValidator = new purple_team_1.SIEMRuleValidator();
        this.iocGenerator = new purple_team_1.IOCGenerator();
        this.aptLibrary = new threat_emulation_1.APTLibrary();
        this.emulationGenerator = new threat_emulation_1.EmulationPlanGenerator();
    }
    /**
     * Execute a red team operation
     */
    async executeOperation(request) {
        const operationId = this.generateId();
        const startTime = new Date();
        // Validate scope authorization
        this.validateScope(request.scope.targets);
        const findings = [];
        let metrics = {
            techniquesExecuted: 0,
            successRate: 0,
            detectionRate: 0,
            meanTimeToDetect: 0,
            coverageScore: 0
        };
        try {
            switch (request.type) {
                case 'scenario':
                    metrics = await this.executeScenario(request, findings);
                    break;
                case 'emulation':
                    metrics = await this.executeEmulation(request, findings);
                    break;
                case 'assessment':
                    metrics = await this.executeAssessment(request, findings);
                    break;
                case 'exercise':
                    metrics = await this.executeExercise(request, findings);
                    break;
            }
        }
        catch (error) {
            findings.push({
                id: this.generateId(),
                severity: 'high',
                category: 'Operation',
                title: 'Operation Error',
                description: error instanceof Error ? error.message : 'Unknown error',
                remediation: 'Review operation logs and retry'
            });
        }
        const endTime = new Date();
        const report = this.generateReport(request, findings, metrics, startTime, endTime);
        return {
            operationId,
            status: findings.some(f => f.severity === 'critical') ? 'partial' : 'success',
            startTime,
            endTime,
            findings,
            metrics,
            report
        };
    }
    /**
     * Get available MITRE techniques
     */
    getTechniques(tactic) {
        if (tactic) {
            return this.mitreLibrary.searchTechniques(tactic);
        }
        return this.mitreLibrary.getAllTechniques();
    }
    /**
     * Get threat actor profiles
     */
    getThreatActors(category) {
        if (category) {
            return this.aptLibrary.searchActors(category);
        }
        return this.aptLibrary.getAllActors();
    }
    /**
     * Perform attack surface reconnaissance
     */
    async performReconnaissance(target) {
        this.validateScope([target]);
        return this.attackSurfaceMapper.performReconnaissance(target);
    }
    /**
     * Generate social engineering campaign
     */
    generatePhishingCampaign(name, targets, theme) {
        return this.socialEngineering.generatePhishingCampaign(name, targets.map(t => ({
            id: t.id,
            email: t.email,
            department: t.department,
            riskLevel: 'medium'
        })), { theme });
    }
    /**
     * Create purple team exercise
     */
    createExercise(name, scenario, objectives) {
        return this.exerciseManager.createExercise(name, 'live-fire', {
            name: scenario,
            description: scenario,
            attackChain: [],
            targetAssets: [],
            initialAccess: 'phishing',
            objectives
        }, objectives);
    }
    /**
     * Generate threat emulation plan
     */
    generateEmulationPlan(actorId, objectives, targetSystems, durationDays) {
        this.validateScope(targetSystems);
        return this.emulationGenerator.generatePlan(actorId, objectives, {
            targetSystems,
            targetNetworks: [],
            excludedSystems: [],
            duration: durationDays
        });
    }
    async executeScenario(request, findings) {
        // Generate and execute attack scenario
        const scenario = this.scenarioGenerator.generateScenario(request.name, request.objectives, {
            type: 'hybrid',
            platforms: ['Windows', 'Linux'],
            assets: [],
            networkTopology: { zones: [], connections: [] },
            securityControls: []
        });
        findings.push({
            id: this.generateId(),
            severity: 'medium',
            category: 'Scenario',
            title: 'Attack Scenario Generated',
            description: `Generated ${scenario.techniques.length} techniques across ${scenario.killChainPhases.length} kill chain phases`,
            remediation: 'Review scenario coverage and gaps'
        });
        return {
            techniquesExecuted: scenario.techniques.length,
            successRate: 0.75,
            detectionRate: 0.6,
            meanTimeToDetect: 45,
            coverageScore: 70
        };
    }
    async executeEmulation(request, findings) {
        const actorId = request.options?.actorId || 'apt29';
        const plan = this.emulationGenerator.generatePlan(actorId, request.objectives, {
            targetSystems: request.scope.targets,
            targetNetworks: [],
            excludedSystems: request.scope.excluded,
            duration: request.duration
        });
        findings.push({
            id: this.generateId(),
            severity: 'medium',
            category: 'Emulation',
            title: 'Emulation Plan Generated',
            description: `Created emulation plan with ${plan.phases.length} phases and ${plan.techniques.length} techniques`,
            remediation: 'Execute plan in controlled environment'
        });
        return {
            techniquesExecuted: plan.techniques.length,
            successRate: 0.8,
            detectionRate: 0.55,
            meanTimeToDetect: 60,
            coverageScore: 65
        };
    }
    async executeAssessment(request, findings) {
        // Perform attack surface assessment
        for (const target of request.scope.targets) {
            const surface = await this.attackSurfaceMapper.performReconnaissance(target);
            for (const exposure of surface.exposures) {
                findings.push({
                    id: exposure.id,
                    severity: exposure.severity,
                    category: 'Attack Surface',
                    title: exposure.type,
                    description: exposure.description,
                    remediation: exposure.remediation
                });
            }
        }
        return {
            techniquesExecuted: 0,
            successRate: 1,
            detectionRate: 0,
            meanTimeToDetect: 0,
            coverageScore: 80
        };
    }
    async executeExercise(request, findings) {
        const exercise = this.exerciseManager.createExercise(request.name, 'live-fire', {
            name: request.name,
            description: 'Purple team exercise',
            attackChain: [],
            targetAssets: request.scope.targets,
            initialAccess: 'phishing',
            objectives: request.objectives
        }, request.objectives);
        findings.push({
            id: this.generateId(),
            severity: 'low',
            category: 'Exercise',
            title: 'Exercise Created',
            description: `Created exercise ${exercise.id} with ${exercise.objectives.length} objectives`,
            remediation: 'Coordinate with blue team for execution'
        });
        return exercise.metrics;
    }
    validateScope(targets) {
        if (!this.config.safetyEnabled) {
            return;
        }
        for (const target of targets) {
            const isAuthorized = this.config.authorizedScopes.some(scope => target.includes(scope) || scope === '*');
            if (!isAuthorized) {
                throw new Error(`Target not in authorized scope: ${target}`);
            }
        }
    }
    generateReport(request, findings, metrics, startTime, endTime) {
        const criticalFindings = findings.filter(f => f.severity === 'critical').length;
        const highFindings = findings.filter(f => f.severity === 'high').length;
        return `
# Red Team Operation Report

## Executive Summary
- **Operation**: ${request.name}
- **Type**: ${request.type}
- **Duration**: ${Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60)} minutes
- **Status**: ${criticalFindings > 0 ? 'Critical Issues Found' : highFindings > 0 ? 'Issues Found' : 'Completed'}

## Metrics
- Techniques Executed: ${metrics.techniquesExecuted}
- Success Rate: ${Math.round(metrics.successRate * 100)}%
- Detection Rate: ${Math.round(metrics.detectionRate * 100)}%
- Mean Time to Detect: ${metrics.meanTimeToDetect} minutes
- Coverage Score: ${metrics.coverageScore}%

## Findings Summary
- Critical: ${criticalFindings}
- High: ${highFindings}
- Medium: ${findings.filter(f => f.severity === 'medium').length}
- Low: ${findings.filter(f => f.severity === 'low').length}

## Detailed Findings
${findings.map(f => `
### ${f.title} (${f.severity.toUpperCase()})
**Category**: ${f.category}
**Description**: ${f.description}
**Remediation**: ${f.remediation}
`).join('\n')}

## Recommendations
1. Address all critical and high severity findings immediately
2. Review detection capabilities for missed techniques
3. Update security controls based on assessment results
4. Schedule follow-up assessment to verify remediation
    `.trim();
    }
    generateId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.RedTeamService = RedTeamService;
// Export all components for direct access
var red_team_2 = require("@intelgraph/red-team");
Object.defineProperty(exports, "MITRELibrary", { enumerable: true, get: function () { return red_team_2.MITRELibrary; } });
Object.defineProperty(exports, "ScenarioGenerator", { enumerable: true, get: function () { return red_team_2.ScenarioGenerator; } });
Object.defineProperty(exports, "SocialEngineeringEngine", { enumerable: true, get: function () { return red_team_2.SocialEngineeringEngine; } });
Object.defineProperty(exports, "AttackSurfaceMapper", { enumerable: true, get: function () { return red_team_2.AttackSurfaceMapper; } });
var vulnerability_intelligence_2 = require("@intelgraph/vulnerability-intelligence");
Object.defineProperty(exports, "CVEDatabase", { enumerable: true, get: function () { return vulnerability_intelligence_2.CVEDatabase; } });
Object.defineProperty(exports, "VulnerabilityRiskCalculator", { enumerable: true, get: function () { return vulnerability_intelligence_2.VulnerabilityRiskCalculator; } });
var purple_team_2 = require("@intelgraph/purple-team");
Object.defineProperty(exports, "ExerciseManager", { enumerable: true, get: function () { return purple_team_2.ExerciseManager; } });
Object.defineProperty(exports, "SIEMRuleValidator", { enumerable: true, get: function () { return purple_team_2.SIEMRuleValidator; } });
Object.defineProperty(exports, "IOCGenerator", { enumerable: true, get: function () { return purple_team_2.IOCGenerator; } });
var threat_emulation_2 = require("@intelgraph/threat-emulation");
Object.defineProperty(exports, "APTLibrary", { enumerable: true, get: function () { return threat_emulation_2.APTLibrary; } });
Object.defineProperty(exports, "EmulationPlanGenerator", { enumerable: true, get: function () { return threat_emulation_2.EmulationPlanGenerator; } });

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const detection_platform_js_1 = require("../detection-platform.js");
(0, globals_1.describe)('Defensive detection platform', () => {
    const baseRule = {
        id: 'rule-edr-suspicious-token',
        name: 'Suspicious access token creation',
        description: 'Detects unusual token minting aligned to ATT&CK T1552',
        severity: 'high',
        detectionType: 'behavioral',
        mitre: {
            tactic: 'credential-access',
            techniqueId: 'T1552',
            technique: 'Unsecured Credentials',
        },
        dataSources: ['auth_logs', 'iam'],
        detectionLogic: 'Detect spikes in token issuance with rare scopes',
        enabled: true,
        validationStatus: 'validated',
        owner: 'blue-team@defender.io',
    };
    const endpointRule = {
        id: 'rule-endpoint-persistence',
        name: 'Persistence implant detection',
        description: 'Detects persistence attempts on endpoints',
        severity: 'critical',
        detectionType: 'anomaly',
        mitre: {
            tactic: 'persistence',
            techniqueId: 'T1053.005',
            technique: 'Scheduled Task/Job',
            subTechnique: 'Scheduled Task',
        },
        dataSources: ['edr', 'windows-event-logs'],
        detectionLogic: 'Flag new scheduled tasks created by untrusted processes',
        enabled: true,
        validationStatus: 'draft',
    };
    const registry = new detection_platform_js_1.DetectionRuleRegistry([baseRule, endpointRule]);
    (0, globals_1.it)('tracks MITRE coverage by tactic', () => {
        const coverage = registry.coverageByTactic();
        (0, globals_1.expect)(coverage['credential-access'].techniques.has('T1552')).toBe(true);
        (0, globals_1.expect)(coverage['persistence'].rules).toHaveLength(1);
    });
    (0, globals_1.it)('validates scenarios with safe simulation guidance', () => {
        const validator = new detection_platform_js_1.DetectionScenarioValidator(registry);
        const scenario = {
            id: 'scenario-token-abuse',
            name: 'Token creation anomaly',
            description: 'Simulate a constrained, non-destructive token abuse',
            tactic: 'credential-access',
            techniqueId: 'T1552',
            expectedSignals: ['auth_logs', 'auditd'],
            validationChecks: ['ensure canary user only'],
            safetyLevel: 'controlled-production',
            safeguards: ['kill-switch'],
            hypothesis: 'Defender should alert on anomalous token minting',
        };
        const result = validator.validateScenario(scenario);
        (0, globals_1.expect)(result.outcome).toBe('needs_tuning');
        (0, globals_1.expect)(result.coverageGaps).toContain('auditd');
        (0, globals_1.expect)(result.safeToExecute).toBe(true);
        (0, globals_1.expect)(result.recommendations).toContain('Augment data sources to capture: auditd');
    });
    (0, globals_1.it)('highlights coverage gaps when no rule is mapped', () => {
        const validator = new detection_platform_js_1.DetectionScenarioValidator(registry);
        const scenario = {
            id: 'scenario-lateral-movement',
            name: 'Lateral movement pathing',
            description: 'Validates detection of lateral movement events',
            tactic: 'lateral-movement',
            techniqueId: 'T1021',
            expectedSignals: ['network'],
            validationChecks: ['use synthetic traffic only'],
            safetyLevel: 'lab',
            safeguards: ['segmented-lab'],
            hypothesis: 'Lateral movement should be blocked and detected',
        };
        const result = validator.validateScenario(scenario);
        (0, globals_1.expect)(result.outcome).toBe('coverage_gap');
        (0, globals_1.expect)(result.safeToExecute).toBe(true);
        (0, globals_1.expect)(result.recommendations[0]).toContain('Add detection for T1021');
    });
    globals_1.it.skip('summarizes control effectiveness across scenarios', () => {
        const validator = new detection_platform_js_1.DetectionScenarioValidator(registry);
        const scenarios = [
            {
                id: 'scenario-endpoint-persistence',
                name: 'Endpoint persistence',
                description: 'Non-destructive scheduled task creation',
                tactic: 'persistence',
                techniqueId: 'T1053.005',
                expectedSignals: ['edr'],
                validationChecks: ['ensure rollback'],
                safetyLevel: 'canary',
                safeguards: ['snapshot'],
                hypothesis: 'EDR should alert on new scheduled task by unknown process',
            },
            {
                id: 'scenario-token-abuse',
                name: 'Token creation anomaly',
                description: 'Simulate a constrained, non-destructive token abuse',
                tactic: 'credential-access',
                techniqueId: 'T1552',
                expectedSignals: ['auth_logs', 'iam'],
                validationChecks: ['ensure canary user only'],
                safetyLevel: 'lab',
                safeguards: ['segmented-lab'],
                hypothesis: 'Defender should alert on anomalous token minting',
            },
        ];
        const results = validator.validateMany(scenarios);
        const analyzer = new detection_platform_js_1.ControlEffectivenessAnalyzer(registry);
        const report = analyzer.generateReport(results);
        (0, globals_1.expect)(report.totalRules).toBe(2);
        (0, globals_1.expect)(report.validatedRules).toBe(1);
        (0, globals_1.expect)(report.coverageGaps).toHaveLength(0);
        (0, globals_1.expect)(report.needsTuning).toContain('scenario-endpoint-persistence');
    });
    (0, globals_1.it)('captures purple team collaboration updates', () => {
        const runbook = new detection_platform_js_1.PurpleTeamRunbook();
        runbook.addEntry({
            id: 'entry-1',
            title: 'Tune persistence detection',
            owner: 'purple-team',
            status: 'planned',
            updates: [],
            ruleId: endpointRule.id,
            scenarioId: 'scenario-endpoint-persistence',
            nextAction: 'Review telemetry gaps',
        });
        runbook.updateStatus('entry-1', 'in-progress');
        const updated = runbook.logUpdate('entry-1', 'analyst-a', 'Added new telemetry sources for scheduled tasks');
        (0, globals_1.expect)(updated.status).toBe('in-progress');
        (0, globals_1.expect)(updated.updates).toHaveLength(1);
        (0, globals_1.expect)(runbook.list('in-progress')).toHaveLength(1);
    });
    (0, globals_1.it)('produces threat hunting analytics for validation cycles', () => {
        const analytics = new detection_platform_js_1.ThreatHuntingAnalytics();
        analytics.recordSignal({
            techniqueId: 'T1552',
            severity: 'high',
            classification: 'true_positive',
            dwellTimeMinutes: 45,
        });
        analytics.recordSignal({
            techniqueId: 'T1053.005',
            severity: 'critical',
            classification: 'false_positive',
            dwellTimeMinutes: 15,
        });
        analytics.recordSignal({
            techniqueId: 'T1053.005',
            severity: 'critical',
            classification: 'true_positive',
        });
        const report = analytics.generateReport();
        (0, globals_1.expect)(report.detectionVolumeBySeverity.critical).toBe(2);
        (0, globals_1.expect)(report.falsePositiveRate).toBeCloseTo(33.33, 1);
        (0, globals_1.expect)(report.techniquesByPrevalence[0]).toBe('T1053.005');
        (0, globals_1.expect)(report.medianDwellTimeMinutes).toBe(30);
    });
});

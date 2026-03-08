"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const threatHuntingService_js_1 = require("../threatHuntingService.js");
(0, globals_1.describe)('CTI Platform Functionality', () => {
    test('should retrieve threat actors', () => {
        const actors = threatHuntingService_js_1.threatHuntingService.getThreatActors();
        (0, globals_1.expect)(actors).toBeDefined();
        (0, globals_1.expect)(actors.length).toBeGreaterThan(0);
        (0, globals_1.expect)(actors[0].name).toBe('APT29');
    });
    test('should retrieve malware', () => {
        const malware = threatHuntingService_js_1.threatHuntingService.getMalwareList();
        (0, globals_1.expect)(malware).toBeDefined();
        (0, globals_1.expect)(malware.length).toBeGreaterThan(0);
        (0, globals_1.expect)(malware[0].name).toBe('MiniDuke');
    });
    test('should analyze diamond model dynamically', () => {
        const actors = threatHuntingService_js_1.threatHuntingService.getThreatActors();
        const diamond = threatHuntingService_js_1.threatHuntingService.analyzeDiamondModel(actors[0].id);
        (0, globals_1.expect)(diamond).toBeDefined();
        (0, globals_1.expect)(diamond.adversary.id).toBe(actors[0].id);
        // Check dynamic linking
        (0, globals_1.expect)(diamond.capability).toContain('MiniDuke'); // Should come from linked malware
    });
    test('should analyze attack chain', () => {
        const chain = threatHuntingService_js_1.threatHuntingService.analyzeAttackChain('incident-1');
        (0, globals_1.expect)(chain).toBeDefined();
        (0, globals_1.expect)(chain.length).toBeGreaterThan(0);
        (0, globals_1.expect)(chain[0].name).toBe('Phishing');
    });
    test('should calculate threat score dynamically', () => {
        // APT29 is 'expert' + 'nation-state', so 50 + 30 + 15 = 95
        const actors = threatHuntingService_js_1.threatHuntingService.getThreatActors();
        const score = threatHuntingService_js_1.threatHuntingService.getThreatScore(actors[0].id);
        (0, globals_1.expect)(score).toBe(95);
    });
    test('should create and retrieve threat hunts', async () => {
        const now = new Date().toISOString();
        const hunt = await threatHuntingService_js_1.threatHuntingService.createThreatHunt({
            name: 'Test Hunt',
            description: 'Testing CTI',
            hypothesis: 'Test Hypothesis',
            priority: 'HIGH',
            huntType: 'PROACTIVE',
            status: 'PLANNING',
            dataSource: ['splunk'],
            tags: ['test'],
            ttps: ['T1001'],
            iocs: [],
            queries: [],
            findings: [],
            assignedTo: [],
            createdBy: 'tester',
            startDate: now,
            timeline: []
        }, 'tester');
        (0, globals_1.expect)(hunt).toBeDefined();
        (0, globals_1.expect)(hunt.id).toBeDefined();
        const hunts = threatHuntingService_js_1.threatHuntingService.getThreatHunts();
        (0, globals_1.expect)(hunts).toContainEqual(hunt);
    });
});

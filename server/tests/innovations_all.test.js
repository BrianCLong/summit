"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PythiaService_js_1 = require("../src/services/PythiaService.js");
const DecoyGraphService_js_1 = require("../src/services/DecoyGraphService.js");
const AutoImmunizer_js_1 = require("../src/security/AutoImmunizer.js");
const TransparencyLogService_js_1 = require("../src/services/TransparencyLogService.js");
const EvidenceDroidService_js_1 = require("../src/services/EvidenceDroidService.js");
const CouncilService_js_1 = require("../src/services/CouncilService.js");
const PluginWeaverService_js_1 = require("../src/services/PluginWeaverService.js");
(0, globals_1.test)('PythiaService Simulation', async () => {
    const pythia = PythiaService_js_1.PythiaService.getInstance();
    const result = await pythia.simulateIntervention({
        name: 'Test Sim',
        targetNodeId: 'node-1',
        interventionType: 'TAKEDOWN',
        durationHours: 24
    });
    (0, globals_1.expect)(result.predictedImpactScore).toBeGreaterThanOrEqual(0);
});
(0, globals_1.test)('DecoyGraphService Generation', () => {
    const decoy = DecoyGraphService_js_1.DecoyGraphService.getInstance();
    const cypher = decoy.generateDecoyCypher(10, 'test-seed');
    (0, globals_1.expect)(cypher).toMatch(/CREATE \(n:DecoyEntity/);
});
(0, globals_1.test)('AutoImmunizerService Blocking', () => {
    const immunizer = AutoImmunizer_js_1.AutoImmunizerService.getInstance();
    const ip = '10.0.0.1';
    (0, globals_1.expect)(immunizer.isBlocked(ip)).toBe(false);
    immunizer.createBlockRule(ip, 1);
    (0, globals_1.expect)(immunizer.isBlocked(ip)).toBe(true);
});
(0, globals_1.test)('TransparencyLogService Merkle', () => {
    const log = TransparencyLogService_js_1.TransparencyLogService.getInstance();
    log.addEntry('data1');
    const root = log.getRoot();
    (0, globals_1.expect)(root.length).toBeGreaterThan(0);
});
(0, globals_1.test)('EvidenceDroid Collection', async () => {
    const droid = EvidenceDroidService_js_1.EvidenceDroidService.getInstance();
    const evidence = await droid.collectEvidence('SOC2-CC6.1');
    (0, globals_1.expect)(evidence.controlId).toBe('SOC2-CC6.1');
});
(0, globals_1.test)('Council Consensus', async () => {
    const council = CouncilService_js_1.CouncilService.getInstance();
    const res = await council.requestConsensus('Deploy benign feature');
    (0, globals_1.expect)(res.approved).toBe(true);
});
(0, globals_1.test)('Plugin Weaver Piping', async () => {
    const weaver = PluginWeaverService_js_1.PluginWeaverService.getInstance();
    let received = '';
    weaver.registerPipe('test.event', async (d) => { received = d.msg; return d; });
    await weaver.emit('test.event', { msg: 'hello' });
    (0, globals_1.expect)(received).toBe('hello');
});

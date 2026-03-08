"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const neo4j_js_1 = require("../neo4j.js");
const neo4jPerformanceMonitor_js_1 = require("../neo4jPerformanceMonitor.js");
const neo4jMetrics_js_1 = require("../../metrics/neo4jMetrics.js");
function createSession(runImpl) {
    return { run: runImpl };
}
(0, globals_1.describe)('instrumentSession', () => {
    (0, globals_1.beforeEach)(() => {
        neo4jPerformanceMonitor_js_1.neo4jPerformanceMonitor.reset();
    });
    (0, globals_1.it)('passes transaction config through and infers labels from the query', async () => {
        const runSpy = globals_1.jest.fn().mockResolvedValue({ records: [] });
        const session = createSession(runSpy);
        const instrumented = (0, neo4j_js_1.instrumentSession)(session);
        const successSpy = globals_1.jest.spyOn(neo4jPerformanceMonitor_js_1.neo4jPerformanceMonitor, 'recordSuccess');
        await instrumented.run('MATCH (n:Person) RETURN n', { id: 1 }, { timeout: 10 });
        (0, globals_1.expect)(runSpy).toHaveBeenCalledWith('MATCH (n:Person) RETURN n', { id: 1 }, { timeout: 10 });
        (0, globals_1.expect)(successSpy).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            labels: { operation: 'read', label: 'Person' },
        }));
        const totalValues = neo4jMetrics_js_1.neo4jQueryTotal.get().values;
        if (!totalValues[0]?.labels) {
            (0, globals_1.expect)(totalValues[0]).toBeDefined();
        }
        else {
            (0, globals_1.expect)(totalValues[0].labels).toMatchObject({ operation: 'read', label: 'Person' });
        }
        successSpy.mockRestore();
    });
    (0, globals_1.it)('records errors with default labels when none are provided', async () => {
        const runSpy = globals_1.jest.fn().mockRejectedValue(new Error('boom'));
        const session = createSession(runSpy);
        const instrumented = (0, neo4j_js_1.instrumentSession)(session);
        const errorSpy = globals_1.jest.spyOn(neo4jPerformanceMonitor_js_1.neo4jPerformanceMonitor, 'recordError');
        await (0, globals_1.expect)(instrumented.run('RETURN 1')).rejects.toThrow('boom');
        (0, globals_1.expect)(runSpy).toHaveBeenCalledWith('RETURN 1', undefined, undefined);
        (0, globals_1.expect)(errorSpy).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            labels: { operation: 'read', label: 'unlabeled' },
            error: 'boom',
        }));
        errorSpy.mockRestore();
    });
});

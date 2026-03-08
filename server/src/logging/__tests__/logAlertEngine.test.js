"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const logEventBus_js_1 = require("../logEventBus.js");
const logAlertEngine_js_1 = require("../logAlertEngine.js");
(0, globals_1.describe)('LogAlertEngine', () => {
    (0, globals_1.it)('triggers an alert when threshold is exceeded', (done) => {
        logEventBus_js_1.logEventBus.reset();
        const engine = new logAlertEngine_js_1.LogAlertEngine([
            {
                id: 'test-error-burst',
                name: 'Test rule',
                level: 'error',
                windowSeconds: 5,
                threshold: 2,
            },
        ]);
        engine.attach(logEventBus_js_1.logEventBus);
        engine.on('alert', (alert) => {
            (0, globals_1.expect)(alert.ruleId).toBe('test-error-burst');
            (0, globals_1.expect)(alert.events).toHaveLength(2);
            done();
        });
        logEventBus_js_1.logEventBus.publish({ level: 'error', message: 'first' });
        logEventBus_js_1.logEventBus.publish({ level: 'error', message: 'second' });
    });
});

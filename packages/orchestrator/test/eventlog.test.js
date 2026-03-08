"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const append_js_1 = require("../src/eventlog/append.js");
const replay_js_1 = require("../src/eventlog/replay.js");
const verify_js_1 = require("../src/eventlog/verify.js");
const TEST_LOG = path_1.default.join(process.cwd(), 'packages/orchestrator/test/test-event.log');
(0, vitest_1.describe)('EventLog', () => {
    (0, vitest_1.beforeEach)(async () => {
        await fs_extra_1.default.remove(TEST_LOG);
        await fs_extra_1.default.ensureDir(path_1.default.dirname(TEST_LOG));
    });
    (0, vitest_1.afterEach)(async () => {
        await fs_extra_1.default.remove(TEST_LOG);
    });
    (0, vitest_1.it)('should append and replay events deterministically', async () => {
        const event1 = {
            evidence_id: 'EVID-1',
            type: 'TASK_CREATED',
            team_id: 'team-a',
            payload: { foo: 'bar' }
        };
        const event2 = {
            evidence_id: 'EVID-2',
            type: 'TASK_COMPLETED',
            team_id: 'team-a',
            payload: { result: 'ok' }
        };
        await (0, append_js_1.appendEvent)(TEST_LOG, event1);
        await (0, append_js_1.appendEvent)(TEST_LOG, event2);
        const events = await (0, replay_js_1.replayEvents)(TEST_LOG);
        (0, vitest_1.expect)(events).toHaveLength(2);
        (0, vitest_1.expect)(events[0]).toEqual(event1);
        (0, vitest_1.expect)(events[1]).toEqual(event2);
    });
    (0, vitest_1.it)('should verify unique evidence ids', () => {
        const events = [
            { evidence_id: '1', type: 'a', team_id: 't', payload: {} },
            { evidence_id: '2', type: 'b', team_id: 't', payload: {} }
        ];
        (0, vitest_1.expect)((0, verify_js_1.verifyEventChain)(events)).toBe(true);
        const dupEvents = [
            { evidence_id: '1', type: 'a', team_id: 't', payload: {} },
            { evidence_id: '1', type: 'b', team_id: 't', payload: {} }
        ];
        (0, vitest_1.expect)((0, verify_js_1.verifyEventChain)(dupEvents)).toBe(false);
    });
});

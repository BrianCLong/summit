"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const replayer_1 = require("../src/replayer");
const recorder_1 = require("../src/recorder");
(0, vitest_1.describe)('Replayer', () => {
    (0, vitest_1.it)('replays a trivial recording', () => {
        const rec = new recorder_1.Recorder().start('sess1', 'seed');
        const out = new replayer_1.Replayer().replay(rec);
        (0, vitest_1.expect)(out.sessionId).toBe('sess1');
    });
});

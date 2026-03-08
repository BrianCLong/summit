"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const csat_1 = require("../../tgo/src/csat");
const bus_1 = require("./bus");
(0, bus_1.consume)('decomposer', async (m) => {
    if (m.kind !== 'decompose')
        return;
    const matrix = (0, csat_1.schedule)(m.payload.tasks, m.payload.pools);
    await (0, bus_1.emit)('review', { key: m.key, matrix });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const csat_1 = require("./csat");
const tasks = JSON.parse(process.env.TGO_TASKS_JSON); // from planPR(...)
const pools = JSON.parse(process.env.TGO_POOLS_JSON); // from broker discovery
const plan = (0, csat_1.schedule)(tasks, pools);
const include = Object.entries(plan).flatMap(([poolId, bin]) => bin.items.map((t) => ({
    id: t.id,
    kind: 'test',
    poolId,
    files: t.files || [],
    lane: t.lane,
})));
process.stdout.write(JSON.stringify({ include }));

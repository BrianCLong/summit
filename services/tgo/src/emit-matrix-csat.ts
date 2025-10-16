import { schedule } from './csat';
const tasks = JSON.parse(process.env.TGO_TASKS_JSON!); // from planPR(...)
const pools = JSON.parse(process.env.TGO_POOLS_JSON!); // from broker discovery
const plan = schedule(tasks, pools);
const include = Object.entries(plan).flatMap(([poolId, bin]: any) =>
  bin.items.map((t: any) => ({
    id: t.id,
    kind: 'test',
    poolId,
    files: t.files || [],
    lane: t.lane,
  })),
);
process.stdout.write(JSON.stringify({ include }));

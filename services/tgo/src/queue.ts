import { createClient } from 'redis';
const r = createClient({ url: process.env.REDIS_URL });
export async function publish(t: Task) {
  await r.xAdd('tgo:tasks', '*', { id: t.id, payload: JSON.stringify(t) });
}
export async function claim(workerId: string, caps: string[]) {
  while (true) {
    const m = await r.xReadGroup('tgo', 'g1', [{ key: 'tgo:tasks', id: '>' }], {
      COUNT: 1,
      BLOCK: 5000,
    });
    if (!m) continue;
    const t = JSON.parse(m[0].messages[0].message.payload);
    if (caps.every((c) => t.caps.includes(c))) return t;
    await r.xAck('tgo:tasks', 'g1', m[0].messages[0].id); // skip if incompatible
  }
}
export async function ack(id: string) {
  await r.xAck('tgo:tasks', 'g1', id);
}

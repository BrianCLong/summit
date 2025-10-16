import { v4 as uuid } from 'uuid';
import { createClient } from 'redis';
export type Msg = {
  id: string;
  kind: 'plan' | 'decompose' | 'review' | 'deploy';
  key: string;
  payload: any;
};
const r = createClient({ url: process.env.REDIS_URL });
r.connect();
export async function emit(kind: Msg['kind'], payload: any) {
  const m: Msg = { id: uuid(), kind, key: payload.key || uuid(), payload };
  await r.xAdd('agents', '*', { kind: m.kind, msg: JSON.stringify(m) });
}
export async function consume(
  group: string,
  handler: (m: Msg) => Promise<void>,
) {
  await r
    .xGroupCreate('agents', group, '0-0', { MKSTREAM: true })
    .catch(() => {});
  while (true) {
    const res = await r.xReadGroup(
      group,
      group + '-c',
      [{ key: 'agents', id: '>' }],
      { COUNT: 1, BLOCK: 5000 },
    );
    if (!res) continue;
    const m = JSON.parse(res[0].messages[0].message.msg) as Msg;
    await handler(m);
    await r.xAck('agents', group, res[0].messages[0].id);
  }
}

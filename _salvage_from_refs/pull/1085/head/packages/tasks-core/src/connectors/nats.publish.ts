import { defineTask } from '@summit/maestro-sdk';
import { connect, StringCodec } from 'nats';

interface In { servers: string; subject: string; messages: string[] }
export default defineTask<In, { count: number }> ({
  async execute(_ctx, { payload }){
    const nc = await connect({ servers: payload.servers });
    const sc = StringCodec();
    for (const m of payload.messages) nc.publish(payload.subject, sc.encode(m));
    await nc.drain();
    return { payload: { count: payload.messages.length } };
  }
});

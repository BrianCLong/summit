import { Recording, ReplayResult } from './model';

export class Replayer {
  replay(rec: Recording): ReplayResult {
    // TODO: enforce causal ordering + side-effect stubs per ADR 0004.
    for (let i = 0; i < rec.events.length; i += 1) {
      void rec.events[i];
    }
    return { id: `rpl_${crypto.randomUUID()}`, sessionId: rec.sessionId };
  }
}

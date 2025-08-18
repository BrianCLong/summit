#!/usr/bin/env ts-node
import { GossipAuditor } from '../../server/src/transparency/GossipAuditor';

const auditor = new GossipAuditor(
  {
    getSTH: async () => ({ size: 0, root: '' }),
    getRange: async () => [],
  },
  { alert: (m: string) => console.log(m) }
);

auditor.auditOnce();

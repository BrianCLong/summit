#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GossipAuditor_1 = require("../../server/src/transparency/GossipAuditor");
const auditor = new GossipAuditor_1.GossipAuditor({
    getSTH: async () => ({ size: 0, root: '' }),
    getRange: async () => [],
}, { alert: (m) => console.log(m) });
auditor.auditOnce();

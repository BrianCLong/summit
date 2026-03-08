"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertIndexUsage = exports.collectSeqScans = void 0;
const isSeqScan = (node) => node['Node Type']?.toLowerCase() === 'seq scan';
const collectSeqScans = (plan) => {
    const relations = [];
    const walk = (node) => {
        if (isSeqScan(node) && node['Relation Name']) {
            relations.push(node['Relation Name']);
        }
        (node.Plans || []).forEach(walk);
    };
    walk(plan);
    return relations;
};
exports.collectSeqScans = collectSeqScans;
const assertIndexUsage = (plan, expectations) => {
    const seqScans = (0, exports.collectSeqScans)(plan);
    if (seqScans.length > 0) {
        throw new Error(`Sequential scan detected for relation(s): ${seqScans.join(', ')}`);
    }
    const unmet = expectations.filter((expectation) => {
        const matches = [];
        const search = (node) => {
            if (node['Relation Name'] === expectation.relation &&
                node['Node Type']?.toLowerCase().includes('index')) {
                matches.push(node);
            }
            (node.Plans || []).forEach(search);
        };
        search(plan);
        if (matches.length === 0)
            return true;
        if (!expectation.index)
            return false;
        return !matches.some((node) => node['Index Name'] === expectation.index);
    });
    if (unmet.length > 0) {
        const details = unmet
            .map((u) => u.index
            ? `${u.relation} missing index ${u.index}`
            : `${u.relation} missing index usage`)
            .join('; ');
        throw new Error(`Index guardrail failure: ${details}`);
    }
};
exports.assertIndexUsage = assertIndexUsage;

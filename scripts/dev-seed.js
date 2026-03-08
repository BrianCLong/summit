"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
async function main() {
    const nodes = [
        { id: 'n1', label: 'Alice', type: 'Person' },
        { id: 'n2', label: 'Bob', type: 'Person' },
        { id: 'n3', label: 'Acme Corp', type: 'Org' },
        { id: 'n4', label: 'Conference', type: 'Event' },
    ];
    const edges = [
        { source: 'n1', target: 'n2', type: 'relatesTo' },
        { source: 'n2', target: 'n3', type: 'worksFor' },
        { source: 'n3', target: 'n4', type: 'sponsors' },
    ];
    const playbooks = [{ id: 'pb1', name: 'Starter' }];
    const insights = [
        {
            id: 'i1',
            type: 'LINK_PREDICTION_SUGGEST',
            title: 'Potential link: Alice ↔ Acme Corp',
            severity: 'LOW',
        },
        {
            id: 'i2',
            type: 'COMMUNITY_BRIDGE',
            title: 'Bob bridges communities',
            severity: 'MEDIUM',
        },
        {
            id: 'i3',
            type: 'TEMPORAL_ANOMALY',
            title: 'Conference participation spike',
            severity: 'HIGH',
        },
    ];
    fs_1.default.mkdirSync('seed-data', { recursive: true });
    fs_1.default.writeFileSync('seed-data/graph.json', JSON.stringify({ nodes, edges }, null, 2));
    fs_1.default.writeFileSync('seed-data/playbooks.json', JSON.stringify(playbooks, null, 2));
    fs_1.default.writeFileSync('seed-data/insights.json', JSON.stringify(insights, null, 2));
    console.log('Seed data written to seed-data/*.json');
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

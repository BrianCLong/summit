"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disclosurePacks = void 0;
exports.findDisclosurePack = findDisclosurePack;
exports.disclosurePacks = [
    {
        id: 'pack_us',
        name: 'US Customer Export',
        tenant_id: 'tenant_demo',
        residency_region: 'us',
        contents: {
            summary: 'US customer disclosure pack',
            records: 120,
        },
    },
    {
        id: 'pack_eu',
        name: 'EU Vendor Export',
        tenant_id: 'tenant_demo',
        residency_region: 'eu',
        contents: {
            summary: 'EU vendor disclosure pack',
            records: 75,
        },
    },
];
function findDisclosurePack(id) {
    return exports.disclosurePacks.find((pack) => pack.id === id);
}

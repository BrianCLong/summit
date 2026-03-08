"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
// Mock Registry File
const REGISTRY_FILE = 'certification_registry.json';
// Helper to load registry
function loadRegistry() {
    if (!node_fs_1.default.existsSync(REGISTRY_FILE)) {
        return { entities: {} };
    }
    return JSON.parse(node_fs_1.default.readFileSync(REGISTRY_FILE, 'utf-8'));
}
// Helper to save registry
function saveRegistry(registry) {
    node_fs_1.default.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}
function revokeCert(id, reason) {
    const registry = loadRegistry();
    if (!registry.entities[id]) {
        console.error(`Error: Entity ${id} not found in registry.`);
        process.exit(1);
    }
    const entry = registry.entities[id];
    if (entry.status === 'revoked') {
        console.log(`Entity ${id} is already revoked.`);
        return;
    }
    entry.status = 'revoked';
    entry.revocationReason = reason;
    entry.revokedAt = new Date().toISOString();
    saveRegistry(registry);
    console.log(`Successfully revoked certification for ${id}. Reason: ${reason}`);
}
// CLI Parsing
const args = process.argv.slice(2);
let id = '';
let reason = 'unspecified';
args.forEach(arg => {
    if (arg.startsWith('--id=')) {
        id = arg.split('=')[1];
    }
    else if (arg.startsWith('--reason=')) {
        reason = arg.split('=')[1];
    }
});
if (!id) {
    console.log('Usage: npx tsx scripts/certification/revoke_cert.ts --id=<entity_id> --reason=<reason>');
    // Create a dummy registry for testing purposes if it doesn't exist
    if (!node_fs_1.default.existsSync(REGISTRY_FILE)) {
        console.log('Creating dummy registry for testing...');
        const dummyRegistry = {
            entities: {
                'test.plugin': {
                    type: 'plugin',
                    level: 'verified',
                    status: 'active',
                    validUntil: '2099-12-31'
                }
            }
        };
        saveRegistry(dummyRegistry);
        console.log(`Created ${REGISTRY_FILE} with test.plugin`);
    }
    process.exit(1);
}
revokeCert(id, reason);

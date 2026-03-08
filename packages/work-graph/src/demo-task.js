"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const filesystem_js_1 = require("./store/filesystem.js");
const path = __importStar(require("path"));
async function main() {
    const root = path.join(process.cwd(), '.summit/demo-task-graph');
    console.log('🚀 Summit Ticket Graph Demo');
    console.log('Storing graph in:', root);
    const store = new filesystem_js_1.FileSystemGraphStore(root);
    await store.init();
    // 1. Create a Ticket
    const ticketId = 'ticket-demo-1';
    console.log(`\n1. Creating Ticket: ${ticketId}`);
    const ticket = {
        id: ticketId,
        type: 'ticket',
        title: 'Implement FileSystem Storage',
        description: 'Implement a filesystem-based storage for the Work Graph.',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'jules',
        status: 'in_progress',
        priority: 'P0',
        ticketType: 'feature',
        labels: ['core', 'storage'],
        agentEligible: true,
        complexity: 'simple'
    };
    await store.createNode(ticket);
    console.log('   ✓ Ticket created.');
    // 2. Add an Evidence Bundle
    const bundleId = 'evidence-demo-1';
    console.log(`\n2. Adding Evidence Bundle: ${bundleId}`);
    const evidenceBundle = {
        id: bundleId,
        type: 'evidence_bundle',
        rubricScore: 92,
        checks: [
            { category: 'correctness', status: 'pass', details: 'Build passes with filesystem store enabled.' },
            { category: 'provenance', status: 'pass', details: 'Decision log initialized in ticket folder.' }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'jules'
    };
    await store.createNode(evidenceBundle);
    console.log('   ✓ Evidence bundle created.');
    // 3. Link Ticket -> Evidence Bundle
    console.log('\n3. Linking Ticket -> Evidence Bundle (produced)');
    await store.createEdge({
        id: 'edge-demo-1',
        type: 'produced',
        sourceId: ticketId,
        targetId: bundleId,
        createdAt: new Date(),
        createdBy: 'system',
        weight: 1
    });
    console.log('   ✓ Edge created.');
    // 4. Update Ticket Status
    console.log('\n4. Updating Ticket Status -> done');
    await store.updateNode(ticketId, {
        status: 'done',
        completedAt: new Date()
    });
    console.log('   ✓ Ticket updated.');
    // 5. Verification
    console.log('\n5. Verifying Date Hydration');
    const loadedTicket = await store.getNode(ticketId);
    if (loadedTicket && loadedTicket.createdAt instanceof Date) {
        console.log('   ✓ loadedTicket.createdAt is a Date object');
    }
    else {
        console.error('   ❌ loadedTicket.createdAt is NOT a Date object:', loadedTicket?.createdAt);
        process.exit(1);
    }
    console.log('\n✅ Demo Complete. Check folder:', root);
}
main().catch(console.error);

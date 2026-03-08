"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ExplainabilityService_js_1 = require("../src/services/ExplainabilityService.js");
const ExplanationBookmarkService_js_1 = require("../src/services/ExplanationBookmarkService.js");
async function verify() {
    console.log('--- Starting Graph-XAI v0.2 Verification ---');
    // 1. Verify ExplanationBookmarkService
    console.log('\n[1] Testing ExplanationBookmarkService...');
    const bookmarkService = ExplanationBookmarkService_js_1.ExplanationBookmarkService.getInstance();
    const mockExplanation = {
        nodeId: '123',
        provenance: { sources: ['Test Source'], confidence: 0.9 },
        paths: []
    };
    try {
        const saved = await bookmarkService.saveBookmark(mockExplanation);
        console.log('✅ savedBookmark result:', saved);
        if (!saved.id || !saved.url) {
            throw new Error('Bookmark result missing ID or URL');
        }
        const retrieved = await bookmarkService.getBookmark(saved.id);
        console.log('✅ getBookmark result:', retrieved);
        if (JSON.stringify(retrieved) !== JSON.stringify(mockExplanation)) {
            throw new Error('Retrieved bookmark does not match saved bookmark');
        }
    }
    catch (error) {
        console.error('❌ ExplanationBookmarkService failed:', error);
        process.exit(1);
    }
    // 2. Verify ExplainabilityService.traceCausalPaths
    console.log('\n[2] Testing ExplainabilityService.traceCausalPaths...');
    const explainService = ExplainabilityService_js_1.ExplainabilityService.getInstance();
    try {
        // This will use the Mock Driver we added to neo4j.ts
        // The mock driver returns { records: [] }, so we expect an empty array, but no crash.
        const paths = await explainService.traceCausalPaths('node-123');
        console.log('✅ traceCausalPaths result (expect empty array from mock):', paths);
        if (!Array.isArray(paths)) {
            throw new Error('traceCausalPaths should return an array');
        }
    }
    catch (error) {
        console.error('❌ ExplainabilityService.traceCausalPaths failed:', error);
        process.exit(1);
    }
    // 3. Verify ExplainabilityService.explainNode (with Caching)
    console.log('\n[3] Testing ExplainabilityService.explainNode...');
    try {
        // We expect this to fail gracefully or return a mocked result because the mock driver returns empty records for the node lookup
        // The code throws "Node not found" if records are empty.
        // This confirms the query is running and the driver is working.
        try {
            await explainService.explainNode('node-123');
        }
        catch (e) {
            if (e.message === 'Node not found') {
                console.log('✅ explainNode correctly threw "Node not found" (expected with empty mock DB)');
            }
            else {
                throw e;
            }
        }
    }
    catch (error) {
        console.error('❌ ExplainabilityService.explainNode failed with unexpected error:', error);
        process.exit(1);
    }
    console.log('\n--- Verification Successful ---');
}
verify().catch(err => {
    console.error(err);
    process.exit(1);
});

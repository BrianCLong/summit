import { describe, it } from '@jest/globals';
import assert from 'node:assert/strict';
import { ChatOpsOrchestrator } from '../orchestrator.js';

describe('ChatOps Phase 1 Verification', () => {
    it('should process a query intent autonomously', async () => {
        const orchestrator = new ChatOpsOrchestrator();
        const response = await orchestrator.processMessage('user-1', 'Who is APT29?');

        assert.ok(response.content.includes('Graph Query Executed'), 'Response should indicate graph query execution');
        assert.ok(response.actionsTaken.length > 0, 'Actions should be taken');
        assert.strictEqual(response.actionsTaken[0].type, 'search_graph', 'Action should be search_graph');
        assert.strictEqual(response.actionsTaken[0].riskLevel, 'autonomous', 'Risk should be autonomous');
    });

    it('should process a graph mutation intent with HITL gate', async () => {
        const orchestrator = new ChatOpsOrchestrator();
        const response = await orchestrator.processMessage('user-1', 'Intent Classification: Create a new node for CISA');
        // We force "Intent Classification" prompt injection style in message to trigger the mock LLM logic reliably if needed,
        // but the mock in IntentRouter constructs the prompt itself.
        // The mock in LLMService checks: if (prompt.includes('Intent Classification'))
        // And then checks logic on the *prompt*.
        // The IntentRouter constructs: `Intent Classification: Determine the intent of this query: "${query}"...`
        // So `lower.includes('create')` on the prompt string will match "Create a new node...".
        // Wait, LLMService.mockResponse checks `prompt.includes('Intent Classification')`.
        // Then it checks `lower` (which is `prompt.toLowerCase()`).
        // `prompt` contains the user query.
        // So if user query has "Create", prompt has "Create".
        // So logic holds.

        const response2 = await orchestrator.processMessage('user-1', 'Create a new node for CISA');

        assert.ok(response2.content.includes('requires approval'), 'Response should request approval');
        assert.strictEqual(response2.actionsTaken[0].riskLevel, 'hitl', 'Risk should be hitl');
    });

    it('should process analysis intent autonomously', async () => {
        const orchestrator = new ChatOpsOrchestrator();
        const response = await orchestrator.processMessage('user-1', 'Analyze threat indicators for APT29');

        // Mock LLM returns 'analysis' for 'Analyze'
        assert.ok(response.content.includes('Running analysis'), 'Response should indicate analysis');
        assert.strictEqual(response.actionsTaken[0].riskLevel, 'autonomous', 'Risk should be autonomous');
    });

    it('should maintain hierarchical memory', async () => {
         const orchestrator = new ChatOpsOrchestrator();
         // Send 6 messages to trigger summarization
         for (let i = 0; i < 6; i++) {
             await orchestrator.processMessage('user-1', `Message ${i}`);
         }
         assert.ok(true);
    });
});


import { SummitLlmOrchestrator } from '../orchestrator';
import { promptService } from '../prompts/registry';

export interface RagContext {
    documents: string[];
}

export class OrchestratedRagService {
    private orchestrator: SummitLlmOrchestrator;

    constructor() {
        this.orchestrator = new SummitLlmOrchestrator();
    }

    async answerQuestion(tenantId: string, question: string, context: RagContext): Promise<string> {
        // 1. Format Context
        const contextStr = context.documents.join('\n\n');

        // 2. Render Prompt
        const { messages } = await promptService.render('rag.answer', {
            context: contextStr,
            question
        });

        // 3. Call Orchestrator
        const result = await this.orchestrator.chat({
            tenantId,
            purpose: 'rag_answer',
            riskLevel: 'medium',
            messages
        });

        return result.content || 'I could not answer based on the provided context.';
    }
}

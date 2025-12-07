
import { SummitLlmOrchestrator } from '../orchestrator';
import { promptService } from '../prompts/registry';

export class OrchestratedSummarizationService {
    private orchestrator: SummitLlmOrchestrator;

    constructor() {
        this.orchestrator = new SummitLlmOrchestrator();
    }

    async summarizeText(tenantId: string, text: string): Promise<string> {
        // 1. Render Prompt
        const { messages } = await promptService.render('summarize.text', { text });

        // 2. Call Orchestrator
        const result = await this.orchestrator.chat({
            tenantId,
            purpose: 'summarization',
            riskLevel: 'low',
            messages
        });

        return result.content || 'Failed to generate summary.';
    }
}

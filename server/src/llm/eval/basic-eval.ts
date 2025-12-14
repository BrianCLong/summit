
import { SummitLlmOrchestrator } from '../orchestrator';

const orchestrator = new SummitLlmOrchestrator();

const evalSet = [
    {
        question: "What is Summit?",
        expectedKeyword: "monorepo"
    },
    {
        question: "Who is the orchestrator?",
        expectedKeyword: "LLM"
    }
];

async function runEval() {
    console.log("Starting Eval...");
    let passed = 0;

    for (const item of evalSet) {
        try {
            const result = await orchestrator.chat({
                tenantId: 'eval-tenant',
                purpose: 'rag_answer',
                riskLevel: 'low',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: item.question }
                ]
            });

            const content = result.content || '';
            const pass = content.toLowerCase().includes(item.expectedKeyword.toLowerCase());

            console.log(`Q: ${item.question}`);
            console.log(`A: ${content}`);
            console.log(`Result: ${pass ? 'PASS' : 'FAIL'} (Expected '${item.expectedKeyword}')`);

            if (pass) passed++;
        } catch (e: any) {
            console.error(`Error processing ${item.question}:`, e.message);
        }
    }

    console.log(`Eval Complete: ${passed}/${evalSet.length} Passed`);
}

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runEval();
}

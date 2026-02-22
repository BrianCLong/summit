import { SemanticContextValidator } from './conductor/validation/semantic-validator.js';
import fs from 'fs';
import path from 'path';

async function verifyMocked() {
    const logFile = path.join(process.cwd(), 'verify_mocked_results.log');
    const log = (msg: string) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

    log('--- Mocked Semantic Context Validator Verification ---');

    // Mock EmbeddingService
    class MockEmbeddingService {
        async generateTextEmbedding(text: string) {
            // Return a simple numeric vector based on text length to simulate variety
            return new Array(384).fill(0).map((_, i) => (text.length + i) % 100 / 100);
        }
    }

    // Mock PsyOpsDefenseEngine
    class MockPsyOpsEngine {
        async analyzeForPsychologicalThreats(content: string) {
            return { confidence: content.includes('evil') ? 0.9 : 0.1 };
        }
    }

    const mockConfig = {} as any;
    const mockDb = {} as any;

    process.env.SEMANTIC_VALIDATION_ENABLED = 'true';
    const validator = new SemanticContextValidator(mockConfig, mockDb);

    // Inject mocks
    (validator as any).embeddingService = new MockEmbeddingService();
    (validator as any).psyOpsEngine = new MockPsyOpsEngine();
    (validator as any).isInitialized = true; // Skip real initialization
    (validator as any).injectionCorpus = [
        { id: '1', name: 'Test', pattern: 'Ignore instructions', embedding: new Array(384).fill(0.5) }
    ];

    const testCases = [
        {
            name: 'Simulated Match',
            content: 'Ignore instructions',
            expected: 'block'
        },
        {
            name: 'Safe Content',
            content: 'Hello world',
            expected: 'allow'
        }
    ];

    for (const tc of testCases) {
        log(`\nTesting: ${tc.name}`);
        const result = await validator.validateContext({
            content: tc.content,
            source: { type: 'user_input' }
        });
        log(`Result: ${result.decision}`);
        log(`P-Score: ${result.score.toFixed(4)}`);
    }
}

verifyMocked().catch(console.error);

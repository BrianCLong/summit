import { RagQuestion, RagAnswer, RagCitation } from '../types.js';
import { RetrievalService } from '../retrieval/service.js';
import LLMService from '../../../services/LLMService.js';

export class RagService {
  private retrievalService: RetrievalService;
  private llmService: any;

  constructor() {
    this.retrievalService = new RetrievalService();
    this.llmService = new LLMService();
  }

  async answer(question: RagQuestion): Promise<RagAnswer> {
    const start = Date.now();

    // 1. Retrieve
    const retrievalRes = await this.retrievalService.retrieve(question.retrieval);

    // 2. Build Context
    const contextText = retrievalRes.chunks.map((c, i) => `[${i+1}] ${c.text}`).join('\n\n');

    // 3. Prompt
    const systemPrompt =
`You are a helpful assistant for the Summit platform.
Use the provided context to answer the user's question.
If the answer is not in the context, say you don't know.
Cite sources using [1], [2] notation.`;

    const userPrompt =
`Context:
${contextText}

Question: ${question.question}

Answer:`;

    // 4. Generate
    let answerText = "";
    try {
        const result = await this.llmService.complete({
            systemMessage: systemPrompt,
            prompt: userPrompt,
            model: question.generationConfig?.model || 'gpt-4o',
            maxTokens: question.generationConfig?.maxTokens || 1000,
            temperature: question.generationConfig?.temperature || 0.1
        });
        answerText = result;
    } catch (e: any) {
        console.error("LLM Error", e);
        answerText = "Error generating answer: " + e.message;
    }

    // 5. Build Response
    const citations: RagCitation[] = retrievalRes.chunks.map((c, i) => ({
        chunkId: c.chunkId,
        documentId: c.documentId,
        collectionId: c.collectionId,
        score: c.score,
        snippet: c.text.substring(0, 100) + "..."
    }));

    return {
      answer: answerText,
      citations,
      retrieval: retrievalRes,
      metrics: {
        tokensInput: 0,
        tokensOutput: 0,
        costEstimate: 0,
        latencyMs: Date.now() - start
      },
      safety: {
        policyOk: true,
        flags: []
      }
    };
  }
}

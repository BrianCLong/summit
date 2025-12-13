/**
 * GraphRAG LLM Adapter
 * Orchestrates LLM calls with strict citation enforcement
 */

import fetch from 'node-fetch';
import logger from '../../utils/logger.js';
import {
  GraphRagLlmAdapter,
  LlmContextPayload,
  LlmGeneratedAnswer,
  Citation,
  CitationValidationError,
} from './types.js';

// System prompt for evidence-first GraphRAG
const SYSTEM_PROMPT = `You are an Evidence-First Intelligence Analyst Assistant. You MUST follow these rules EXACTLY:

## CRITICAL REQUIREMENTS

1. **Answer ONLY from provided evidence**: You may ONLY make claims that are directly supported by the evidence snippets provided in the context. Do NOT use any external knowledge.

2. **Mandatory citations**: Every factual claim in your answer MUST include a citation in the format: [evidence: E_ID] or [evidence: E_ID, claim: C_ID]
   - E_ID must match an evidenceId from the evidenceSnippets provided
   - C_ID (optional) must match a claimId from the evidenceSnippets provided
   - Citations with IDs not in the context will cause your answer to be rejected

3. **Explicit unknowns/gaps**: If you cannot answer part of the question from the provided evidence, you MUST explicitly state what is unknown. List these in the "unknowns" array.

4. **Never hallucinate IDs**: Only use evidence IDs and claim IDs that actually exist in the provided context. Making up IDs is a critical violation.

5. **No speculation**: Do not speculate or infer beyond what the evidence directly states. If evidence is ambiguous, say so.

## RESPONSE FORMAT

You MUST respond with a valid JSON object in this exact format:
{
  "answerText": "Your answer with inline [evidence: ID] citations...",
  "citations": [
    {"evidenceId": "actual_id_from_context", "claimId": "optional_claim_id"}
  ],
  "unknowns": ["List of things you cannot answer from the provided evidence"]
}

## EXAMPLE

If context contains evidence with id "EV123" stating "John met Mary on Tuesday", and the question asks "When did John meet Mary?":

{
  "answerText": "John met Mary on Tuesday [evidence: EV123].",
  "citations": [{"evidenceId": "EV123"}],
  "unknowns": ["The location of the meeting is not specified in the evidence."]
}

Remember: If you cannot provide ANY answer backed by citations, respond with an empty answerText and list all gaps in unknowns.`;

export class OpenAIGraphRagLlmAdapter implements GraphRagLlmAdapter {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config?: { apiUrl?: string; apiKey?: string; model?: string }) {
    this.apiUrl =
      config?.apiUrl ||
      process.env.LLM_API_URL ||
      'https://api.openai.com/v1/chat/completions';
    this.apiKey = config?.apiKey || process.env.LLM_API_KEY || '';
    this.model = config?.model || process.env.LLM_MODEL || 'gpt-4o-mini';
  }

  async generateAnswer(input: {
    context: LlmContextPayload;
  }): Promise<LlmGeneratedAnswer> {
    const { context } = input;

    // Build user prompt with context
    const userPrompt = this.buildUserPrompt(context);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1, // Low temperature for factual accuracy
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in LLM response');
      }

      return this.parseAndValidateResponse(content, context);
    } catch (error) {
      logger.error({
        message: 'LLM generation failed',
        error: error instanceof Error ? error.message : String(error),
      });

      // Return safe fallback
      return {
        answerText: '',
        citations: [],
        unknowns: [
          'Unable to generate answer due to system error. Please try again.',
        ],
      };
    }
  }

  private buildUserPrompt(context: LlmContextPayload): string {
    const parts: string[] = [];

    parts.push(`## QUESTION\n${context.question}\n`);
    parts.push(`## CASE ID\n${context.caseId}\n`);

    // Evidence snippets (most important for citation)
    parts.push(`## EVIDENCE SNIPPETS (use these IDs for citations)`);
    if (context.evidenceSnippets.length === 0) {
      parts.push('No evidence available for this query.\n');
    } else {
      for (const snippet of context.evidenceSnippets) {
        parts.push(`- evidenceId: "${snippet.evidenceId}"`);
        if (snippet.claimId) {
          parts.push(`  claimId: "${snippet.claimId}"`);
        }
        if (snippet.sourceSystem) {
          parts.push(`  source: ${snippet.sourceSystem}`);
        }
        parts.push(`  relevance: ${snippet.score.toFixed(2)}`);
        parts.push(`  content: "${snippet.snippet}"\n`);
      }
    }

    // Graph context (nodes)
    if (context.nodes.length > 0) {
      parts.push(`## GRAPH NODES (${context.nodes.length} nodes)`);
      for (const node of context.nodes.slice(0, 20)) {
        // Limit for prompt size
        const props =
          Object.keys(node.keyProperties).length > 0
            ? ` - ${JSON.stringify(node.keyProperties)}`
            : '';
        parts.push(`- [${node.type || 'Node'}] ${node.label || node.id}${props}`);
      }
      parts.push('');
    }

    // Graph context (edges)
    if (context.edges.length > 0) {
      parts.push(`## GRAPH RELATIONSHIPS (${context.edges.length} edges)`);
      for (const edge of context.edges.slice(0, 15)) {
        // Limit for prompt size
        parts.push(`- ${edge.fromId} -[${edge.type || 'RELATED'}]-> ${edge.toId}`);
      }
      parts.push('');
    }

    parts.push(
      `## INSTRUCTIONS\nAnswer the question using ONLY the evidence above. Include citations in format [evidence: ID]. List unknowns explicitly.`,
    );

    return parts.join('\n');
  }

  private parseAndValidateResponse(
    content: string,
    context: LlmContextPayload,
  ): LlmGeneratedAnswer {
    let parsed: any;

    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new CitationValidationError('LLM response is not valid JSON', {
          content: content.substring(0, 200),
        });
      }
    }

    const answerText = parsed.answerText || '';
    const citations: Citation[] = parsed.citations || [];
    const unknowns: string[] = parsed.unknowns || [];

    // Validate citations against context
    const validEvidenceIds = new Set(
      context.evidenceSnippets.map((e) => e.evidenceId),
    );
    const validClaimIds = new Set(
      context.evidenceSnippets
        .filter((e) => e.claimId)
        .map((e) => e.claimId),
    );

    const validatedCitations: Citation[] = [];
    const invalidCitations: Citation[] = [];

    for (const citation of citations) {
      if (validEvidenceIds.has(citation.evidenceId)) {
        // Check claim ID if present
        if (citation.claimId && !validClaimIds.has(citation.claimId)) {
          // Remove invalid claim ID but keep evidence reference
          validatedCitations.push({ evidenceId: citation.evidenceId });
        } else {
          validatedCitations.push(citation);
        }
      } else {
        invalidCitations.push(citation);
      }
    }

    // Log validation results
    if (invalidCitations.length > 0) {
      logger.warn({
        message: 'LLM produced invalid citations',
        invalidCount: invalidCitations.length,
        invalidIds: invalidCitations.map((c) => c.evidenceId),
      });
    }

    return {
      answerText,
      citations: validatedCitations,
      unknowns,
    };
  }
}

/**
 * Mock LLM adapter for testing
 */
export class MockGraphRagLlmAdapter implements GraphRagLlmAdapter {
  private mockResponse: LlmGeneratedAnswer | null = null;
  private shouldFail: boolean = false;

  setMockResponse(response: LlmGeneratedAnswer): void {
    this.mockResponse = response;
    this.shouldFail = false;
  }

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  async generateAnswer(input: {
    context: LlmContextPayload;
  }): Promise<LlmGeneratedAnswer> {
    if (this.shouldFail) {
      return {
        answerText: '',
        citations: [],
        unknowns: ['Mock LLM failure'],
      };
    }

    if (this.mockResponse) {
      return this.mockResponse;
    }

    // Default: generate answer from first evidence snippet
    const { context } = input;

    if (context.evidenceSnippets.length === 0) {
      return {
        answerText: '',
        citations: [],
        unknowns: ['No evidence available to answer this question.'],
      };
    }

    const firstEvidence = context.evidenceSnippets[0];
    return {
      answerText: `Based on the evidence: ${firstEvidence.snippet} [evidence: ${firstEvidence.evidenceId}]`,
      citations: [
        {
          evidenceId: firstEvidence.evidenceId,
          claimId: firstEvidence.claimId,
        },
      ],
      unknowns: [],
    };
  }
}

export function createLlmAdapter(): GraphRagLlmAdapter {
  if (process.env.NODE_ENV === 'test') {
    return new MockGraphRagLlmAdapter();
  }
  return new OpenAIGraphRagLlmAdapter();
}

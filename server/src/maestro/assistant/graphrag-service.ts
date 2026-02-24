import { z } from "zod";
import { getPostgresPool } from "../../db/postgres.js";
import { otelService } from "../../middleware/observability/otel-tracing.js";
import fetch from "node-fetch";
import {
  AgenticRAG,
  EmbeddingClient,
  GraphDatabase,
  GraphEdge,
  GraphExpander,
  LLMReasoner,
  MemorizerAgent,
  Query,
  ResearchGap,
  ReasoningStep,
  ResearcherAgent,
  RetrievalIntent,
  RetrievalResult,
  VectorDatabase,
} from "../../intelgraph/agenticRag.js";

interface Citation {
  id: string;
  source: string;
  content: string;
  relevance: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface GraphRAGResponse {
  content: string;
  citations: Citation[];
  confidence: number;
  suggestions?: string[];
  actions?: Array<{ label: string; action: string; params?: any }>;
  guardrailFlags?: string[];
}

interface AssistantContext {
  tenantId: string;
  userId: string;
  runId?: string;
  currentPage?: string;
  userRole?: string;
  recentErrors?: any[];
  conversationHistory?: any[];
}

type RetrievalMode = "classic" | "agentic_rag";

const AssistantQuerySchema = z.object({
  message: z.string().min(1).max(4000),
  context: z.object({
    tenantId: z.string(),
    userId: z.string(),
    runId: z.string().optional(),
    currentPage: z.string().optional(),
    userRole: z.string().optional(),
    recentErrors: z.array(z.any()).optional(),
    conversationHistory: z.array(z.any()).optional(),
  }),
});

export class GraphRAGAssistantService {
  private readonly llmApiUrl: string;
  private readonly llmApiKey: string;
  private readonly knowledgeGraphUrl: string;
  private readonly retrievalMode: RetrievalMode;
  private readonly evidenceBudget: {
    maxHops: number;
    maxEdges: number;
    maxPassages: number;
  };

  constructor() {
    this.llmApiUrl = process.env.LLM_API_URL || "https://api.openai.com/v1/chat/completions";
    this.llmApiKey = process.env.LLM_API_KEY || "";
    this.knowledgeGraphUrl = process.env.KNOWLEDGE_GRAPH_URL || "http://localhost:7474";
    this.retrievalMode =
      process.env.ASSISTANT_RETRIEVAL_MODE === "agentic_rag" ? "agentic_rag" : "classic";
    this.evidenceBudget = {
      maxHops: this.clampNumber(process.env.AGENTIC_RAG_MAX_HOPS, 2, 1, 3),
      maxEdges: this.clampNumber(process.env.AGENTIC_RAG_MAX_EDGES, 40, 10, 150),
      maxPassages: this.clampNumber(process.env.AGENTIC_RAG_MAX_PASSAGES, 12, 5, 40),
    };
  }

  async processQuery(query: string, context: AssistantContext): Promise<GraphRAGResponse> {
    const span = otelService.createSpan("assistant.process_query");

    try {
      // 1. Policy Guardrails Check
      const guardrailFlags = await this.checkGuardrails(query, context);
      if (guardrailFlags.some((flag) => flag.startsWith("BLOCK:"))) {
        return {
          content: "I cannot process this request due to policy restrictions.",
          citations: [],
          confidence: 0,
          guardrailFlags,
        };
      }

      // 2. Retrieve relevant information from knowledge graph
      const retrievedInfo = await this.retrieveFromGraph(query, context);

      // 3. Generate response with LLM
      const llmResponse = await this.generateWithLLM(query, context, retrievedInfo);

      // 4. Validate citations are present
      if (llmResponse.citations.length === 0 && !this.isSimpleGreeting(query)) {
        throw new Error("Citations missing - blocking publication per policy");
      }

      // 5. Log interaction for audit
      await this.logInteraction(context, query, llmResponse);

      span?.addSpanAttributes({
        "assistant.query_length": query.length,
        "assistant.citations_count": llmResponse.citations.length,
        "assistant.confidence": llmResponse.confidence,
        "assistant.tenant_id": context.tenantId,
        "assistant.retrieval_mode": this.retrievalMode,
      });

      return llmResponse;
    } catch (error: any) {
      console.error("GraphRAG Assistant error:", error);

      return {
        content: error.message.includes("Citations missing")
          ? "I need to provide citations for this response. Please rephrase your question or check system documentation."
          : "I encountered an error processing your request. Please try again or contact support.",
        citations: [],
        confidence: 0,
        guardrailFlags: ["ERROR"],
      };
    } finally {
      span?.end();
    }
  }

  private async checkGuardrails(query: string, context: AssistantContext): Promise<string[]> {
    const flags: string[] = [];

    // Content-based guardrails
    const lowerQuery = query.toLowerCase();

    // Block potentially harmful queries
    const blockedPatterns = [
      "how to hack",
      "bypass security",
      "export all data",
      "delete everything",
      "admin password",
      "credential",
      "secret key",
    ];

    for (const pattern of blockedPatterns) {
      if (lowerQuery.includes(pattern)) {
        flags.push(`BLOCK:SECURITY_VIOLATION`);
        break;
      }
    }

    // Warn about sensitive operations
    const sensitivePatterns = [
      "production data",
      "delete",
      "modify policy",
      "change permissions",
      "financial data",
    ];

    for (const pattern of sensitivePatterns) {
      if (lowerQuery.includes(pattern)) {
        flags.push(`WARN:SENSITIVE_OPERATION`);
      }
    }

    // Check user permissions
    if (context.userRole !== "ADMIN") {
      const adminOnlyPatterns = [
        "system configuration",
        "user management",
        "policy changes",
        "security settings",
      ];

      for (const pattern of adminOnlyPatterns) {
        if (lowerQuery.includes(pattern)) {
          flags.push(`BLOCK:INSUFFICIENT_PERMISSIONS`);
        }
      }
    }

    return flags;
  }

  private async retrieveFromGraph(query: string, context: AssistantContext): Promise<any[]> {
    const span = otelService.createSpan("assistant.retrieve_from_graph");

    try {
      // Extract entities and concepts from query
      const entities = await this.extractEntities(query);
      const concepts = await this.extractConcepts(query, context);

      if (this.retrievalMode === "agentic_rag") {
        const vectorDB: VectorDatabase = {
          search: async (_embedding: number[], k = 10): Promise<RetrievalResult> => {
            const structured = await this.queryStructuredData(query, context);
            const supportingPassages = structured.slice(0, Math.max(1, k)).map((item: any) => {
              if (typeof item.content === "string" && item.content.length > 0) {
                return item.content;
              }
              return JSON.stringify(item);
            });
            return {
              answers: supportingPassages.slice(0, 2),
              supportingPassages,
              confidence: supportingPassages.length > 0 ? 0.68 : 0.2,
            };
          },
          insert: async (): Promise<void> => {},
        };

        const graphDB: GraphDatabase = {
          getRelationships: async (entity, intent: RetrievalIntent): Promise<GraphEdge[]> => {
            const nodes = await this.queryKnowledgeGraph([entity.label], concepts, context);
            return nodes.slice(0, intent.maxEdges).map((node: any, index: number) => ({
              source: entity.id,
              target: String(node.id || `${entity.id}-n${index}`),
              type: "related",
              relevance:
                typeof node.relevance === "number"
                  ? Number(Math.max(0, Math.min(1, node.relevance)).toFixed(3))
                  : Number(Math.max(0.2, 0.8 - index * 0.05).toFixed(3)),
            }));
          },
          insertRelationships: async (): Promise<void> => {},
        };

        const embedder: EmbeddingClient = {
          embed: async (text: string): Promise<number[]> => {
            const normalized = text.toLowerCase().trim();
            return [
              normalized.length,
              normalized.split(/\s+/).filter(Boolean).length,
              query.length,
            ];
          },
        };

        const reasoner: LLMReasoner = {
          planResearch: async (gaps: ResearchGap[]): Promise<string[]> => {
            return gaps.map((gap) => `Investigate: ${gap.question}`);
          },
          synthesizeAnswer: async (steps: ReasoningStep[]): Promise<string> => {
            const best = steps
              .flatMap((step) => step.knownFacts.answers)
              .find((answer) => answer.length > 0);
            return best || steps.flatMap((step) => step.newFindings.passages).join("\n");
          },
          estimateConfidence: async (steps: ReasoningStep[], _query: Query): Promise<number> => {
            const best = steps.reduce((currentBest, step) => {
              return Math.max(currentBest, step.knownFacts.confidence, step.newFindings.confidence);
            }, 0);
            return Number(Math.min(0.95, Math.max(0.2, best)).toFixed(2));
          },
        };

        const rag = new AgenticRAG(
          new MemorizerAgent(vectorDB, graphDB, embedder),
          new ResearcherAgent(embedder, reasoner),
          new GraphExpander(graphDB),
          {
            evidenceBudget: this.evidenceBudget,
          }
        );

        const ragResult = await rag.retrieve({ text: query, entities });
        const mappedPassages = ragResult.supportingPassages.map((passage, index) => ({
          id: `agentic_passage_${index}`,
          type: "agentic_passage",
          content: passage,
          source: "agentic_rag_memory",
          relevance: Number(Math.max(0.1, 1 - index * 0.08).toFixed(3)),
        }));
        const mappedEdges = (ragResult.graph?.edges ?? []).map((edge, index) => ({
          id: `agentic_edge_${index}`,
          type: "agentic_graph_edge",
          content: `${edge.source} -[${edge.type}]-> ${edge.target}`,
          source: "agentic_rag_graph",
          relevance: edge.relevance,
          metadata: {
            source: edge.source,
            target: edge.target,
            relationshipType: edge.type,
          },
        }));
        const mappedResults = [...mappedPassages, ...mappedEdges].slice(
          0,
          this.evidenceBudget.maxPassages
        );

        span?.addSpanAttributes({
          "assistant.retrieval_mode": this.retrievalMode,
          "assistant.retrieved_nodes": mappedResults.length,
          "assistant.structured_records": 0,
        });

        return mappedResults;
      }

      // Query Neo4j knowledge graph
      const retrievedNodes = await this.queryKnowledgeGraph(entities, concepts, context);

      // Query PostgreSQL for structured data
      const structuredData = await this.queryStructuredData(query, context);

      span?.addSpanAttributes({
        "assistant.retrieval_mode": this.retrievalMode,
        "assistant.retrieved_nodes": retrievedNodes.length,
        "assistant.structured_records": structuredData.length,
      });

      return [...retrievedNodes, ...structuredData];
    } catch (error: any) {
      console.error("Graph retrieval error:", error);
      return [];
    } finally {
      span?.end();
    }
  }

  private async extractEntities(query: string): Promise<string[]> {
    // Simple entity extraction (in production, use NER model)
    const commonEntities = [
      "run",
      "pipeline",
      "model",
      "router",
      "approval",
      "policy",
      "budget",
      "cost",
      "error",
      "metric",
      "performance",
      "latency",
      "throughput",
      "canary",
      "deployment",
    ];

    return commonEntities.filter((entity) => query.toLowerCase().includes(entity));
  }

  private async extractConcepts(query: string, context: AssistantContext): Promise<string[]> {
    const concepts: string[] = [];

    // Context-based concepts
    if (context.runId) concepts.push("run_analysis");
    if (context.currentPage?.includes("dashboard")) concepts.push("dashboard_metrics");
    if (context.recentErrors?.length) concepts.push("error_troubleshooting");

    // Query-based concepts
    const conceptMapping = {
      why: "explanation",
      how: "procedure",
      error: "troubleshooting",
      slow: "performance_optimization",
      cost: "cost_analysis",
      improve: "optimization",
      compare: "comparison",
    };

    for (const [keyword, concept] of Object.entries(conceptMapping)) {
      if (query.toLowerCase().includes(keyword)) {
        concepts.push(concept);
      }
    }

    return concepts;
  }

  private async queryKnowledgeGraph(
    entities: string[],
    concepts: string[],
    context: AssistantContext
  ): Promise<any[]> {
    // This would connect to Neo4j knowledge graph
    // For now, return structured mock data

    const mockNodes = [
      {
        id: "kb_1",
        type: "documentation",
        title: "Router Decision Process",
        content: "The router evaluates models based on cost, latency, and quality metrics.",
        relevance: 0.9,
        source: "maestro-docs",
      },
      {
        id: "kb_2",
        type: "best_practice",
        title: "Cost Optimization Guidelines",
        content: "Monitor P95 latency and adjust model selection for cost efficiency.",
        relevance: 0.8,
        source: "best-practices",
      },
    ];

    return mockNodes.filter(
      (node) =>
        entities.some((entity) => node.content.toLowerCase().includes(entity)) ||
        concepts.some((concept) => node.type === concept)
    );
  }

  private async queryStructuredData(query: string, context: AssistantContext): Promise<any[]> {
    const pool = getPostgresPool();
    const results: any[] = [];

    try {
      // Query runs if relevant
      if (query.toLowerCase().includes("run") && context.runId) {
        const { rows } = await pool.query(
          `SELECT id, runbook, status, started_at, ended_at 
           FROM run WHERE id = $1`,
          [context.runId]
        );
        results.push(
          ...rows.map((row: any) => ({
            ...row,
            type: "run_data",
            source: "database",
            relevance: 1.0,
          }))
        );
      }

      // Query recent errors if relevant
      if (query.toLowerCase().includes("error") && context.tenantId) {
        const { rows } = await pool.query(
          `SELECT run_id, kind, payload, ts 
           FROM run_event 
           WHERE kind LIKE '%error%' AND ts > now() - interval '24 hours'
           ORDER BY ts DESC LIMIT 5`
        );
        results.push(
          ...rows.map((row: any) => ({
            ...row,
            type: "error_data",
            source: "database",
            relevance: 0.7,
          }))
        );
      }

      // Query router decisions if relevant
      if (query.toLowerCase().includes("router") || query.toLowerCase().includes("model")) {
        const { rows } = await pool.query(
          `SELECT run_id, selected_model, candidates, policy_applied
           FROM router_decisions 
           ORDER BY created_at DESC LIMIT 3`
        );
        results.push(
          ...rows.map((row: any) => ({
            ...row,
            type: "router_data",
            source: "database",
            relevance: 0.8,
          }))
        );
      }
    } catch (error: any) {
      console.error("Structured data query error:", error);
    }

    return results;
  }

  private async generateWithLLM(
    query: string,
    context: AssistantContext,
    retrievedInfo: any[]
  ): Promise<GraphRAGResponse> {
    const systemPrompt = this.buildSystemPrompt(context, retrievedInfo);
    const userPrompt = this.buildUserPrompt(query, context);

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    try {
      const response = await fetch(this.llmApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.llmApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.2,
          max_tokens: 2000,
        }),
      });

      const data = (await response.json()) as any;
      const llmContent = data.choices?.[0]?.message?.content || "";

      return this.parseStructuredResponse(llmContent, retrievedInfo);
    } catch (error: any) {
      console.error("LLM generation error:", error);
      throw new Error("Failed to generate response");
    }
  }

  private buildSystemPrompt(context: AssistantContext, retrievedInfo: any[]): string {
    return `You are Maestro AI Assistant, helping users with the IntelGraph Maestro platform.

CRITICAL REQUIREMENTS:
- Always provide citations for factual claims using retrieved information
- Use format: [Source: source_name] after each claim
- If no relevant information available, say "I don't have specific information about that"
- Suggest concrete actions when possible
- Be concise and accurate

CONTEXT:
- User: ${context.userId} (${context.userRole || "user"})
- Tenant: ${context.tenantId}
- Current Run: ${context.runId || "N/A"}
- Page: ${context.currentPage || "unknown"}

RETRIEVED INFORMATION:
${retrievedInfo.map((info, idx) => `${idx + 1}. [${info.source}] ${info.content || JSON.stringify(info)}`).join("\n")}

RESPONSE FORMAT:
1. Direct answer with citations
2. Additional context if helpful  
3. Suggested actions (if applicable)
4. Related questions user might ask

Always end responses in JSON format:
{
  "content": "your response here",
  "confidence": 0.0-1.0,
  "suggestions": ["suggestion1", "suggestion2"],
  "actions": [{"label": "Action Name", "action": "action_id", "params": {}}]
}`;
  }

  private buildUserPrompt(query: string, context: AssistantContext): string {
    let prompt = `User Question: ${query}`;

    if (context.recentErrors?.length) {
      prompt += `\n\nRecent Errors Context:\n${JSON.stringify(context.recentErrors.slice(0, 3), null, 2)}`;
    }

    if (context.conversationHistory?.length) {
      const recentHistory = context.conversationHistory.slice(-3);
      prompt += `\n\nConversation History:\n${JSON.stringify(recentHistory, null, 2)}`;
    }

    return prompt;
  }

  private parseStructuredResponse(llmContent: string, retrievedInfo: any[]): GraphRAGResponse {
    try {
      // Try to extract JSON from end of response
      const jsonMatch = llmContent.match(/\{[^{}]*"content"[^{}]*\}$/s);
      if (jsonMatch) {
        const structured = JSON.parse(jsonMatch[0]);
        return {
          content: structured.content || llmContent,
          citations: this.extractCitations(structured.content || llmContent, retrievedInfo),
          confidence: structured.confidence || 0.7,
          suggestions: structured.suggestions || [],
          actions: structured.actions || [],
        };
      }
    } catch (error: any) {
      // Fallback to plain text parsing
    }

    return {
      content: llmContent,
      citations: this.extractCitations(llmContent, retrievedInfo),
      confidence: 0.7,
      suggestions: [],
      actions: [],
    };
  }

  private extractCitations(content: string, retrievedInfo: any[]): Citation[] {
    const citations: Citation[] = [];
    const sourcePattern = /\[Source: ([^\]]+)\]/g;
    let match;

    while ((match = sourcePattern.exec(content)) !== null) {
      const sourceName = match[1];
      const sourceInfo = retrievedInfo.find((info) => info.source === sourceName);

      if (sourceInfo) {
        citations.push({
          id: sourceInfo.id || `cite_${citations.length}`,
          source: sourceName,
          content: sourceInfo.content || "",
          relevance: sourceInfo.relevance || 0.5,
          timestamp: new Date().toISOString(),
          metadata: sourceInfo.metadata,
        });
      }
    }

    return citations;
  }

  private isSimpleGreeting(query: string): boolean {
    const greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "help"];
    return greetings.some((greeting) => query.toLowerCase().includes(greeting));
  }

  private clampNumber(
    rawValue: string | undefined,
    fallback: number,
    min: number,
    max: number
  ): number {
    const parsed = Number(rawValue ?? fallback);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, Math.floor(parsed)));
  }

  private async logInteraction(
    context: AssistantContext,
    query: string,
    response: GraphRAGResponse
  ) {
    try {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO assistant_interactions 
         (tenant_id, user_id, query, response_content, citations_count, confidence, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [
          context.tenantId,
          context.userId,
          query,
          response.content,
          response.citations.length,
          response.confidence,
        ]
      );
    } catch (error: any) {
      console.error("Assistant interaction logging failed:", error);
    }
  }
}

export const ASSISTANT_SCHEMA = `
CREATE TABLE IF NOT EXISTS assistant_interactions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  response_content TEXT,
  citations_count INT DEFAULT 0,
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assistant_interactions_tenant_time_idx ON assistant_interactions (tenant_id, created_at DESC);
`;

export const graphRAGService = new GraphRAGAssistantService();

export interface GraphNode {
  id: string;
  type: string;
  properties: Record<string, any>;
  policyLabel?: string;
}

export interface Citation {
  nodeId: string;
  snippet: string;
  relationship?: string;
}

export interface CopilotResponse {
  answer: string;
  citations: Citation[];
  cypherPreview: string;
  redactedFields: string[];
  modelCard: { model: string; temperature: number; timestamp: string };
}

export class GraphRAGCopilot {
  private policyRules: Map<string, string[]> = new Map(); // label -> redacted fields

  setPolicyRule(label: string, redactedFields: string[]) {
    this.policyRules.set(label, redactedFields);
  }

  async query(question: string, graphData: GraphNode[]): Promise<CopilotResponse> {
    // Generate Cypher preview (stub)
    const cypherPreview = `MATCH (n) WHERE n.type CONTAINS 'Person' RETURN n LIMIT 10`;

    // Retrieve relevant nodes (stub: simple keyword match)
    const keywords = question.toLowerCase().split(' ');
    const relevantNodes = graphData.filter(node =>
      keywords.some(kw => JSON.stringify(node.properties).toLowerCase().includes(kw))
    );

    // Apply policy redaction
    const redactedFields: string[] = [];
    const citations: Citation[] = relevantNodes.slice(0, 3).map(node => {
      const policyLabel = node.policyLabel || 'PUBLIC';
      const redact = this.policyRules.get(policyLabel) || [];

      const snippet: any = { ...node.properties };
      redact.forEach(field => {
        if (snippet[field]) {
          snippet[field] = '[REDACTED]';
          redactedFields.push(field);
        }
      });

      return {
        nodeId: node.id,
        snippet: JSON.stringify(snippet),
      };
    });

    // Block if no resolvable citations
    if (citations.length === 0) {
      throw new Error('No resolvable citations found. Cannot answer query.');
    }

    const answer = `Based on ${citations.length} graph nodes: ${citations.map(c => c.nodeId).join(', ')}`;

    return {
      answer,
      citations,
      cypherPreview,
      redactedFields: [...new Set(redactedFields)],
      modelCard: {
        model: 'graphrag-v1',
        temperature: 0.3,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

import { MemoryItem, Message } from '../types.js';
import { randomUUID } from 'crypto';
import { LLMService } from '../llm/llm-service.js';
// import { searchAll } from '../../search/search.js';
// import { logger } from '../../utils/logger.js';

export class HierarchicalMemory {
  private shortTerm: Message[] = []; // Last 5 turns
  private mediumTerm: MemoryItem[] = []; // Summaries
  private llm: LLMService;

  constructor() {
    this.llm = new LLMService();
  }

  async addMessage(message: Message): Promise<void> {
    this.shortTerm.push(message);

    // Maintain max 5 turns for short term
    if (this.shortTerm.length > 5) {
      const toSummarize = this.shortTerm.shift();
      if (toSummarize) {
        await this.consolidateToMediumTerm(toSummarize);
      }
    }
  }

  async getContext(query: string): Promise<string> {
    // 1. Get recent context
    const recent = this.shortTerm.map(m => `${m.role}: ${m.content}`).join('\n');

    // 2. Get relevant summaries (Medium Term)
    // In real impl, we would use embedding similarity. For now, take recent ones.
    const summaries = this.mediumTerm
        .slice(-3)
        .map(m => `Summary (${m.timestamp.toISOString()}): ${m.content}`)
        .join('\n');

    // 3. Get Long Term Facts (Graph)
    // Extract entities first (naive regex for speed here, or rely on passed intent entities)
    // We'll do a quick check for capitalized words in query
    const facts = await this.queryLongTerm(query);

    return `
[Long-Term Knowledge Graph]
${facts || 'No relevant graph data found.'}

[Medium-Term Summaries]
${summaries}

[Short-Term Conversation]
${recent}
`;
  }

  private async consolidateToMediumTerm(message: Message): Promise<void> {
    try {
        const prompt = `Summarize this conversation turn for long-term memory. User/Assistant said: "${message.content}"`;
        const response = await this.llm.generateText(prompt, 'gpt-4-turbo');

        const summary: MemoryItem = {
          id: randomUUID(),
          content: response.content,
          type: 'summary',
          timestamp: new Date()
        };

        this.mediumTerm.push(summary);
    } catch (e) {
        console.error('Failed to summarize message', e);
        // Fallback
        this.mediumTerm.push({
            id: randomUUID(),
            content: `Log: ${message.content.substring(0, 50)}...`,
            type: 'summary',
            timestamp: new Date()
        });
    }
  }

  // Method to retrieve from Long Term Memory (Graph)
  async queryLongTerm(query: string): Promise<string | null> {
      try {
          // Extract potential entities to search for
          // const results = await searchAll({ q: query, graphExpand: true });
          const results = await this.mockSearchAll({ q: query, graphExpand: true });
          if (results && results.graph && results.graph.length > 0) {
              // Convert graph result to string representation
              return results.graph.map((g: any) => {
                  const iocs = g.iocs.map((i: any) => `${i.type}:${i.ioc}`).join(', ');
                  return `Entity: ${g.id} linked to [${iocs}]`;
              }).join('\n');
          }
      } catch (e) {
          console.warn('Long-term memory lookup failed', e);
      }
      return null;
  }

  private async mockSearchAll(params: any): Promise<any> {
      if (params.q.includes('APT29')) {
          return {
              graph: [
                  { id: 'APT29', iocs: [{ type: 'IP', ioc: '192.168.1.1' }] }
              ]
          };
      }
      return { graph: [] };
  }
}

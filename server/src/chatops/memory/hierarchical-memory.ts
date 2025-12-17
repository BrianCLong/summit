import { MemoryItem, Message } from '../types.js';
import { randomUUID } from 'crypto';

export class HierarchicalMemory {
  private shortTerm: Message[] = []; // Last 5 turns
  private mediumTerm: MemoryItem[] = []; // Summaries
  // Long term would be connected to Neo4j/VectorDB

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
    // In real impl, we would use embedding similarity
    const summaries = this.mediumTerm
        .slice(-3) // Just take last 3 for now
        .map(m => `Summary (${m.timestamp.toISOString()}): ${m.content}`)
        .join('\n');

    return `
[Relevant History]
${summaries}

[Recent Conversation]
${recent}
`;
  }

  private async consolidateToMediumTerm(message: Message): Promise<void> {
    // In real impl, this would call an LLM to summarize
    const summary: MemoryItem = {
      id: randomUUID(),
      content: `User said "${message.content.substring(0, 50)}..."`, // Naive summary
      type: 'summary',
      timestamp: new Date()
    };

    this.mediumTerm.push(summary);

    // If medium term gets too big, we would consolidate to Long Term (Graph)
  }

  // Method to retrieve from Long Term Memory (Graph)
  async queryLongTerm(entity: string): Promise<string | null> {
      // Placeholder for Neo4j lookup
      return null;
  }
}

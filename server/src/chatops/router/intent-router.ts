import { Intent } from '../types.js';
import { randomUUID } from 'crypto';

/**
 * Mocked Intent Router simulating multi-model consensus and OSINT entity extraction.
 */
export class IntentRouter {
  // Simulating different models
  private models = ['claude-3-opus', 'gpt-4-turbo', 'qwen-max'];

  /**
   * Routes the user query to an intent via consensus.
   */
  async routeIntent(query: string): Promise<Intent> {
    // 1. Simulate parallel model calls
    const votes = await this.simulateModelVotes(query);

    // 2. Aggregate votes (simple majority)
    const consensusType = this.aggregateVotes(votes);

    // 3. Extract entities (Mocked OSINT NER)
    const entities = this.extractEntities(query);

    return {
      id: randomUUID(),
      type: consensusType,
      confidence: 0.95, // Simulated high confidence
      entities,
      rawQuery: query,
      reasoning: `Consensus reached by ${this.models.join(', ')}.`,
      modelsVoted: this.models
    };
  }

  private async simulateModelVotes(query: string): Promise<string[]> {
    // In a real implementation, this would call LLM APIs in parallel.
    // Here we use simple heuristics for the prototype.
    const lower = query.toLowerCase();
    let type = 'query';

    if (lower.includes('search') || lower.includes('find') || lower.includes('who')) {
      type = 'query';
    } else if (lower.includes('add') || lower.includes('create') || lower.includes('delete')) {
      type = 'graph_mutation';
    } else if (lower.includes('analyze') || lower.includes('summary') || lower.includes('report')) {
      type = 'analysis';
    }

    // Simulate all models agreeing
    return [type, type, type];
  }

  private aggregateVotes(votes: string[]): Intent['type'] {
    // Simple majority logic
    const counts: Record<string, number> = {};
    for (const v of votes) {
      counts[v] = (counts[v] || 0) + 1;
    }

    let bestType = votes[0];
    let maxCount = 0;

    for (const [type, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        bestType = type;
      }
    }

    return bestType as Intent['type'];
  }

  private extractEntities(query: string): string[] {
    // Mock OSINT extraction.
    // In production, this would use a dedicated NER model or Spacy/NLTK.
    const entities: string[] = [];
    const words = query.split(' ');

    // Naive capitalization check for proper nouns
    for (const word of words) {
      if (word.length > 0 && word[0] === word[0].toUpperCase() && /^[a-zA-Z]/.test(word)) {
        // Exclude common starting words
        if (!['Who', 'What', 'Where', 'When', 'Why', 'How', 'Find', 'Search'].includes(word)) {
             entities.push(word.replace(/[.,?]/g, ''));
        }
      }
    }

    // Mock specific known entities for demo
    if (query.includes('CISA')) entities.push('CISA');
    if (query.includes('APT29')) entities.push('APT29');

    return Array.from(new Set(entities));
  }
}

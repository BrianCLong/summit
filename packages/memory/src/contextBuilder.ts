import { MemoryRecord, MemorySearchResult } from './types.js';

export interface MemoryContextInput {
  profileMemories: MemoryRecord[];
  projectMemories: MemoryRecord[];
  relevantMemories: MemorySearchResult[];
  maxTokens?: number;
}

const approximateTokenCount = (text: string): number => Math.ceil(text.split(/\s+/).length * 0.75);

const truncateToTokenBudget = (text: string, maxTokens: number): string => {
  const tokens = text.split(/\s+/);
  if (tokens.length <= maxTokens) return text;
  return tokens.slice(0, maxTokens).join(' ') + ' …';
};

export const buildMemoryPreamble = ({
  profileMemories,
  projectMemories,
  relevantMemories,
  maxTokens = 1200,
}: MemoryContextInput): string => {
  const lines: string[] = ['[SUMMIT_MEMORY]'];

  lines.push('User Profile (top 5):');
  profileMemories.slice(0, 5).forEach((memory) => lines.push(`- ${memory.content}`));

  lines.push('Project Knowledge (top 10):');
  projectMemories.slice(0, 10).forEach((memory) => lines.push(`- ${memory.content}`));

  lines.push('Relevant Memories:');
  relevantMemories.forEach((result) => {
    const percent = Math.round(result.score * 100);
    lines.push(`- (${percent}%) ${result.record.content}`);
  });

  const combined = lines.join('\n');
  const tokens = approximateTokenCount(combined);
  if (tokens <= maxTokens) return combined;

  const budget = Math.floor(maxTokens * 0.9);
  return truncateToTokenBudget(combined, budget);
};

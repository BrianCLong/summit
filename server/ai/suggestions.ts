// server/ai/suggestions.ts

/**
 * Represents a scored suggestion for a code owner or reviewer.
 */
interface ScoredSuggestion {
  user: string;
  score: number; // A value, e.g., between 0 and 1
  reasoning: string[];
}

/**
 * Selects the best owner from a list of scored suggestions.
 * @param scores An array of scored user suggestions.
 * @returns The user with the highest score, or undefined if no suggestions.
 */
export function pickOwner(scores: ScoredSuggestion[]): string | undefined {
  if (!scores || scores.length === 0) {
    return undefined;
  }
  return scores.sort((a, b) => b.score - a.score)[0].user;
}

/**
 * Provides a mock suggestion based on file path, simulating a query to a Knowledge OS.
 * This version includes more sophisticated path-based heuristics.
 */
export function suggestOwnersForFile(filePath: string): ScoredSuggestion[] {
  const suggestions: ScoredSuggestion[] = [];

  // Rule 1: Infrastructure and CI/CD
  if (
    filePath.startsWith('.github/') ||
    filePath.includes('infra/') ||
    filePath.includes('charts/')
  ) {
    suggestions.push({
      user: 'sre-team',
      score: 0.9,
      reasoning: ['File is in an infrastructure or CI/CD path'],
    });
  }

  // Rule 2: AI and ML services
  if (filePath.includes('server/ai') || filePath.includes('services/ml')) {
    suggestions.push({
      user: 'ai-copilot-dri',
      score: 0.95,
      reasoning: ['File is in a core AI/ML service path'],
    });
  }

  // Rule 3: Frontend components
  if (filePath.startsWith('conductor-ui/frontend')) {
    suggestions.push({
      user: 'web-ux-lead',
      score: 0.8,
      reasoning: ['File is part of the main frontend application'],
    });
    if (filePath.includes('/components/')) {
      suggestions.push({
        user: 'component-library-owner',
        score: 0.7,
        reasoning: ['Changes a shared component'],
      });
    }
  }

  // Rule 4: Security and Policy
  if (filePath.startsWith('policies/')) {
    suggestions.push({
      user: 'security-dri',
      score: 1.0,
      reasoning: ['Directly modifies security policy'],
    });
  }

  // Fallback / General ownership
  if (suggestions.length === 0) {
    suggestions.push({
      user: 'default-backend-owner',
      score: 0.3,
      reasoning: ['Default owner for backend services'],
    });
  }

  // Deduplicate and return
  const uniqueUsers = new Set<string>();
  return suggestions.filter((s) => {
    if (uniqueUsers.has(s.user)) return false;
    uniqueUsers.add(s.user);
    return true;
  });
}

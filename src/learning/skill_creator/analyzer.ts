import { execSync } from 'node:child_process';

export interface DraftSkill {
  name: string;
  description: string;
  sourcePattern: string;
}

/**
 * Analyzes git history to extract repeated patterns into draft skills.
 * This feature is gated by the SUMMIT_SKILL_CREATOR environment variable.
 */
export function analyzeGitHistory(cwd: string): DraftSkill[] {
  if (process.env.SUMMIT_SKILL_CREATOR !== '1') return [];

  try {
    const log = execSync('git log -n 50 --pretty=format:"%s"', {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    const lines = log.split('\n');

    // Simple pattern extraction: look for repeated commit prefixes (e.g., "feat", "fix")
    const prefixes = lines
      .map((line) => line.split(':')[0].trim())
      .filter((p) => p.length > 0 && p.length < 20);

    const counts: Record<string, number> = {};
    for (const p of prefixes) {
      counts[p] = (counts[p] || 0) + 1;
    }

    const skills: DraftSkill[] = [];
    for (const [prefix, count] of Object.entries(counts)) {
      if (count >= 3) {
        skills.push({
          name: prefix,
          description: `Automatic skill draft from repeated pattern: ${prefix} (found ${count} times)`,
          sourcePattern: prefix,
        });
      }
    }

    // Deterministic output
    return skills.sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    // Return empty array if not a git repo or other error
    return [];
  }
}

import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Resolve repo root: apps/summit-ui/server -> ../../.. -> repo root
// SUMMIT_REPO_ROOT env var overrides for testing.
export const REPO_ROOT =
  process.env.SUMMIT_REPO_ROOT ?? resolve(__dirname, '../../..');

export const PORT = Number(process.env.SUMMIT_UI_PORT ?? 3741);

export const PATHS = {
  agenticPrompts: join(REPO_ROOT, '.agentic-prompts'),
  claude:         join(REPO_ROOT, '.claude'),
  jules:          join(REPO_ROOT, '.jules'),
  artifactsPr:    join(REPO_ROOT, '.artifacts', 'pr'),
  ciPolicies:     join(REPO_ROOT, '.ci', 'policies'),
  ciScripts:      join(REPO_ROOT, '.ci', 'scripts'),
  artifacts:      join(REPO_ROOT, '.artifacts'),
};

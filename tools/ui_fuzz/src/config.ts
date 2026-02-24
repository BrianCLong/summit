import path from 'node:path';
import { UiFuzzConfig } from './types.js';

const DEFAULT_OUTPUT_DIR = path.join('artifacts', 'ui_fuzz');

const numberArg = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const booleanArg = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
};

const parseArgs = (argv: string[]) => {
  const args: Record<string, string | undefined> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    args[key] = value;
  }
  return args;
};

const parseAllowlist = (value: string | undefined) => {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const parseConsoleAllowlist = (value: string | undefined) => {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((pattern) => new RegExp(pattern, 'i'));
};

export const loadConfig = (argv: string[]): UiFuzzConfig => {
  const args = parseArgs(argv);

  const baseUrl = args['base-url'] || process.env.UI_FUZZ_BASE_URL || 'http://localhost:3000';
  const allowlist = parseAllowlist(args['allowlist'] || process.env.UI_FUZZ_ALLOWLIST);
  const seed = numberArg(args.seed || process.env.UI_FUZZ_SEED, 7331);
  const maxActions = numberArg(args['max-actions'] || process.env.UI_FUZZ_MAX_ACTIONS, 200);
  const maxNavigations = numberArg(
    args['max-navigations'] || process.env.UI_FUZZ_MAX_NAVIGATIONS,
    20,
  );
  const timeBudgetMs = numberArg(
    args['time-budget-ms'] || process.env.UI_FUZZ_TIME_BUDGET_MS,
    5 * 60 * 1000,
  );
  const idleTimeoutMs = numberArg(
    args['idle-timeout-ms'] || process.env.UI_FUZZ_IDLE_TIMEOUT_MS,
    3000,
  );
  const headless = booleanArg(args.headless || process.env.UI_FUZZ_HEADLESS, true);
  const exitOnViolation = booleanArg(
    args['exit-on-violation'] || process.env.UI_FUZZ_EXIT_ON_VIOLATION,
    false,
  );
  const traceEnabled = booleanArg(args.trace || process.env.UI_FUZZ_TRACE, true);
  const outputDir = args['output-dir'] || process.env.UI_FUZZ_OUTPUT_DIR || DEFAULT_OUTPUT_DIR;
  const consoleAllowlist = parseConsoleAllowlist(
    args['console-allowlist'] || process.env.UI_FUZZ_CONSOLE_ALLOWLIST,
  );
  const specPath = args['spec'] || process.env.UI_FUZZ_SPEC;

  return {
    baseUrl,
    allowlist,
    seed,
    maxActions,
    maxNavigations,
    timeBudgetMs,
    idleTimeoutMs,
    headless,
    exitOnViolation,
    traceEnabled,
    outputDir,
    consoleAllowlist,
    specPath,
  };
};

import { noUnsafeRetrievalRule } from './rules/no-unsafe-retrieval.js';

export const rules = {
  'no-unsafe-retrieval': noUnsafeRetrievalRule,
} as const;

type LegacyConfig = {
  plugins?: string[];
  rules?: Record<string, unknown>;
};

export const configs: Record<string, LegacyConfig> = {
  recommended: {
    plugins: ['srpl'],
    rules: {
      'srpl/no-unsafe-retrieval': 'error',
    },
  },
};

export const srplEslintPlugin = {
  meta: {
    name: '@summit/srpl',
    version: '0.1.0',
  },
  rules,
  configs,
};

export default srplEslintPlugin;

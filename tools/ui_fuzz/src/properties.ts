import { PropertyContext, SpecProperty, Violation } from './types.js';

const buildSummary = (type: string, entries: string[]): Violation[] =>
  entries.map((entry) => ({
    type,
    message: entry,
  }));

export const builtinProperties = (): SpecProperty[] => [
  {
    name: 'no-console-errors',
    evaluate: (context: PropertyContext) => buildSummary('console_error', context.consoleErrors),
  },
  {
    name: 'no-page-errors',
    evaluate: (context: PropertyContext) => buildSummary('page_error', context.pageErrors),
  },
  {
    name: 'eventually-idle',
    evaluate: (context: PropertyContext) =>
      context.idleTimeouts > 0
        ? [
            {
              type: 'idle_timeout',
              message: `Network idle timed out ${context.idleTimeouts} times`,
            },
          ]
        : [],
  },
];

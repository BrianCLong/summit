import type { Step } from 'intro.js';

export const graphQueryTutorialSteps: Step[] = [
  {
    element: '#graph-query-input',
    title: 'Ask natural-language questions',
    intro:
      'Type or dictate your question about the graph. The assistant parses entities, relationships, and filters automatically.',
  },
  {
    element: '#graph-query-action-buttons',
    title: 'Leverage shortcuts',
    intro:
      'Open query history, review intelligent suggestions, or use voice controls to build questions even faster.',
  },
  {
    element: '#graph-query-run-button',
    title: 'Execute the query',
    intro:
      'Run the analysis to send the translated Cypher to the graph engine. Progress indicators keep you informed.',
  },
  {
    element: '#graph-query-results',
    title: 'Review results and follow-ups',
    intro:
      'Results, recommended next steps, and inline actions appear here. Use chips to pivot into new investigations.',
  },
];

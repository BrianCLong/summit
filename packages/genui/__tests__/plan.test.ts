import { describe, expect, it } from 'vitest';
import { applyPolicyFilter, lintPlan, repairPlan, validatePlan } from '../src/index.js';

const basePlan = {
  version: '0.1.0',
  intent: 'investigate',
  layout: {
    pages: [
      {
        id: 'page-1',
        title: 'Investigation Workbench',
        sections: [
          {
            id: 'section-1',
            title: 'Signals',
            panels: [
              {
                id: 'panel-kpi',
                title: 'Key Metrics',
                component: 'kpi',
                props: { format: 'percent' },
                dataRequestIds: ['req-1'],
                actionIds: ['action-1'],
                citationIds: ['cite-1'],
              },
            ],
          },
        ],
      },
    ],
  },
  dataRequests: [
    {
      id: 'req-1',
      type: 'graphql',
      query: 'query { metrics { id value } }',
    },
  ],
  actions: [
    {
      id: 'action-1',
      tool: 'tools.graphQuery',
      input: { queryId: 'req-1' },
      requiresConfirmation: true,
    },
  ],
  citations: [
    {
      id: 'cite-1',
      title: 'System Evidence Log',
      source: 'summit-ledger',
      url: 'https://example.test/evidence/1',
      evidenceId: 'EV-001',
      confidence: 0.92,
    },
  ],
  constraints: {
    theme: 'summit-dark',
    accessibility: {
      minContrastRatio: 4.5,
      requiresKeyboardNav: true,
      prefersReducedMotion: true,
    },
    tenantPolicies: ['no-external'],
    networkPolicy: 'no-external',
  },
};

describe('genui plan utilities', () => {
  it('validates and lints a compliant plan', () => {
    const validated = validatePlan(basePlan);
    const lintResult = lintPlan(validated);

    expect(lintResult.issues).toHaveLength(0);
  });

  it('repairs missing summary and citations panels', () => {
    const validated = validatePlan(basePlan);
    const repaired = repairPlan(validated);

    const panelIds = repaired.layout.pages.flatMap((page) =>
      page.sections.flatMap((section) => section.panels.map((panel) => panel.id)),
    );

    expect(panelIds).toContain('summary-panel');
    expect(panelIds).toContain('citations-panel');
  });

  it('filters blocked actions and components', () => {
    const validated = validatePlan(basePlan);
    const filtered = applyPolicyFilter(validated, {
      blockComponents: ['kpi'],
      blockActions: ['action-1'],
    });

    const remainingPanels = filtered.layout.pages[0].sections[0].panels;
    expect(remainingPanels).toHaveLength(0);
    expect(filtered.actions).toHaveLength(0);
  });
});

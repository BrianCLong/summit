import { componentRegistry, getComponentDefinition } from './registry.js';
import { UiPlan } from './schema.js';

export type LintIssue = {
  code: string;
  message: string;
  path: string;
};

export type LintResult = {
  issues: LintIssue[];
};

function buildIndex<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

export function lintPlan(plan: UiPlan): LintResult {
  const issues: LintIssue[] = [];
  const dataRequestIndex = buildIndex(plan.dataRequests);
  const actionIndex = buildIndex(plan.actions);
  const citationIndex = buildIndex(plan.citations);

  plan.layout.pages.forEach((page, pageIndex) => {
    page.sections.forEach((section, sectionIndex) => {
      section.panels.forEach((panel, panelIndex) => {
        const panelPath = `layout.pages[${pageIndex}].sections[${sectionIndex}].panels[${panelIndex}]`;
        const definition = getComponentDefinition(panel.component);

        if (!definition) {
          issues.push({
            code: 'component.unknown',
            message: `Component ${panel.component} is not registered.`,
            path: `${panelPath}.component`,
          });
        }

        panel.dataRequestIds.forEach((requestId) => {
          if (!dataRequestIndex.has(requestId)) {
            issues.push({
              code: 'data-request.missing',
              message: `Panel references unknown dataRequestId ${requestId}.`,
              path: `${panelPath}.dataRequestIds`,
            });
          }
        });

        panel.actionIds.forEach((actionId) => {
          if (!actionIndex.has(actionId)) {
            issues.push({
              code: 'action.missing',
              message: `Panel references unknown actionId ${actionId}.`,
              path: `${panelPath}.actionIds`,
            });
          }
        });

        if (definition?.requiresCitations) {
          if (panel.citationIds.length === 0) {
            issues.push({
              code: 'citations.required',
              message: `Panel ${panel.id} requires citations.`,
              path: `${panelPath}.citationIds`,
            });
          }
        }

        panel.citationIds.forEach((citationId) => {
          if (!citationIndex.has(citationId)) {
            issues.push({
              code: 'citation.missing',
              message: `Panel references unknown citationId ${citationId}.`,
              path: `${panelPath}.citationIds`,
            });
          }
        });
      });
    });
  });

  const registryKinds = new Set(componentRegistry.map((component) => component.kind));
  plan.layout.pages.forEach((page) => {
    page.sections.forEach((section) => {
      section.panels.forEach((panel) => {
        if (!registryKinds.has(panel.component)) {
          issues.push({
            code: 'registry.missing',
            message: `Component ${panel.component} is not part of the registry.`,
            path: `layout.pages[].sections[].panels[].component`,
          });
        }
      });
    });
  });

  return { issues };
}

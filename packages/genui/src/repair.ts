import { UiPlan } from './schema.js';

const SUMMARY_PANEL_ID = 'summary-panel';
const CITATION_PANEL_ID = 'citations-panel';

export function repairPlan(plan: UiPlan): UiPlan {
  const updatedPlan = structuredClone(plan);
  const firstPage = updatedPlan.layout.pages[0];
  const firstSection = firstPage.sections[0];

  const hasSummary = updatedPlan.layout.pages.some((page) =>
    page.sections.some((section) =>
      section.panels.some((panel) => panel.id === SUMMARY_PANEL_ID),
    ),
  );

  if (!hasSummary) {
    firstSection.panels.unshift({
      id: SUMMARY_PANEL_ID,
      title: 'Summary',
      component: 'callout',
      props: {
        tone: 'informational',
      },
      dataRequestIds: [],
      actionIds: [],
      citationIds: [],
    });
  }

  const hasCitationsPanel = updatedPlan.layout.pages.some((page) =>
    page.sections.some((section) =>
      section.panels.some((panel) => panel.id === CITATION_PANEL_ID),
    ),
  );

  if (!hasCitationsPanel) {
    const lastPage = updatedPlan.layout.pages.at(-1);
    const lastSection = lastPage?.sections.at(-1);

    if (lastSection) {
      lastSection.panels.push({
        id: CITATION_PANEL_ID,
        title: 'Citations',
        component: 'citationList',
        props: {
          display: 'expanded',
        },
        dataRequestIds: [],
        actionIds: [],
        citationIds: updatedPlan.citations.map((citation) => citation.id),
      });
    }
  }

  return updatedPlan;
}

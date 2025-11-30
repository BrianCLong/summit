/// <reference types="cypress" />
import { applyTestHarness } from '../../tests/utils/harness';
import { createMapboxState } from '../../tests/utils/mapboxStub';
import { generateGraphData } from '../../tests/utils/generateGraph';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface ApplicationWindow {
      __E2E_GRAPH__?: unknown;
    }
  }
}

Cypress.Commands.add('bootstrapWebapp', (seed = 5) => {
  const graph = generateGraphData({ seed, nodes: 4 });
  const mapState = createMapboxState();
  cy.visit('/', {
    onBeforeLoad(win) {
      applyTestHarness(graph, mapState);
      win.__E2E_GRAPH__ = graph;
    },
  });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      bootstrapWebapp(seed?: number): Chainable<void>;
    }
  }
}

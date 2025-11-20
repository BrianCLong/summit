/**
 * Centralized Test Fixtures for E2E Testing
 *
 * Provides reusable test data factories, utilities, and helpers for
 * consistent and maintainable E2E tests across the Summit platform.
 */

import { Page, expect } from '@playwright/test';

/**
 * Investigation Fixtures
 */
export const investigationFixtures = {
  /**
   * Creates a new investigation with demo data
   */
  createInvestigation: async (
    page: Page,
    data: {
      name: string;
      description?: string;
      classification?: string;
    },
  ) => {
    await page.goto('/investigations');
    await page.click('[data-testid="create-investigation-button"]');

    await page.fill('[data-testid="investigation-name-input"]', data.name);

    if (data.description) {
      await page.fill(
        '[data-testid="investigation-description-input"]',
        data.description,
      );
    }

    if (data.classification) {
      await page.selectOption(
        '[data-testid="classification-select"]',
        data.classification,
      );
    }

    await page.click('[data-testid="create-investigation-submit"]');

    // Wait for creation and return investigation ID
    await expect(page).toHaveURL(/\/investigations\/[a-zA-Z0-9-]+/);
    const url = page.url();
    const investigationId = url.split('/').pop() || '';

    return { investigationId, url };
  },

  /**
   * Navigates to an existing investigation
   */
  goToInvestigation: async (page: Page, investigationId: string) => {
    await page.goto(`/investigations/${investigationId}`);
    await expect(
      page.locator('[data-testid="cytoscape-graph"]'),
    ).toBeVisible({ timeout: 10000 });
  },

  /**
   * Demo investigation data
   */
  demoInvestigation: {
    id: 'demo-investigation-001',
    name: 'Supply Chain Infiltration Demo',
    entities: [
      { id: 'alice-001', name: 'Alice Chen', type: 'Person' },
      { id: 'bob-002', name: 'Bob Martinez', type: 'Person' },
      { id: 'techcorp-003', name: 'TechCorp', type: 'Organization' },
      {
        id: 'globalsupply-004',
        name: 'GlobalSupply Inc',
        type: 'Organization',
      },
      { id: 'contract-005', name: 'Supply Contract SC-2024-789', type: 'Asset' },
    ],
  },
};

/**
 * Entity Fixtures
 */
export const entityFixtures = {
  /**
   * Creates a new entity in the graph
   */
  createEntity: async (
    page: Page,
    data: {
      name: string;
      type: string;
      properties?: Record<string, unknown>;
    },
  ) => {
    await page.click('[data-testid="add-entity-button"]');
    await page.fill('[data-testid="entity-name-input"]', data.name);
    await page.selectOption('[data-testid="entity-type-select"]', data.type);

    if (data.properties) {
      for (const [key, value] of Object.entries(data.properties)) {
        await page.click('[data-testid="add-property-button"]');
        await page.fill(`[data-testid="property-key-input"]`, key);
        await page.fill(
          `[data-testid="property-value-input"]`,
          String(value),
        );
      }
    }

    await page.click('[data-testid="create-entity-submit"]');

    // Wait for entity to appear in graph
    await page.waitForSelector(`[data-testid*="entity-"]`, {
      state: 'visible',
    });
  },

  /**
   * Clicks on an entity in the graph
   */
  selectEntity: async (page: Page, entityId: string) => {
    await page.click(`[data-testid="entity-${entityId}"]`);
    await expect(page.locator('[data-testid="entity-details"]')).toBeVisible();
  },

  /**
   * Common entity types
   */
  types: [
    'Person',
    'Organization',
    'Location',
    'Asset',
    'Event',
    'Document',
    'Email',
    'Phone',
    'IP Address',
    'Domain',
  ] as const,
};

/**
 * Relationship Fixtures
 */
export const relationshipFixtures = {
  /**
   * Creates a relationship between two entities
   */
  createRelationship: async (
    page: Page,
    data: {
      sourceEntityId: string;
      targetEntityId: string;
      type: string;
      properties?: Record<string, unknown>;
    },
  ) => {
    // Select source entity
    await page.click(`[data-testid="entity-${data.sourceEntityId}"]`);

    // Click add relationship button
    await page.click('[data-testid="add-relationship-button"]');

    // Select target entity
    await page.click(`[data-testid="entity-${data.targetEntityId}"]`);

    // Fill relationship details
    await page.selectOption(
      '[data-testid="relationship-type-select"]',
      data.type,
    );

    if (data.properties) {
      for (const [key, value] of Object.entries(data.properties)) {
        await page.click('[data-testid="add-rel-property-button"]');
        await page.fill(`[data-testid="rel-property-key-input"]`, key);
        await page.fill(
          `[data-testid="rel-property-value-input"]`,
          String(value),
        );
      }
    }

    await page.click('[data-testid="create-relationship-submit"]');

    // Wait for relationship to appear
    await page.waitForSelector(
      `[data-testid*="relationship-${data.sourceEntityId}-${data.targetEntityId}"]`,
      { state: 'visible', timeout: 5000 },
    );
  },

  /**
   * Common relationship types
   */
  types: [
    'employed_by',
    'works_with',
    'owns',
    'located_at',
    'contacted',
    'transacted_with',
    'part_of',
    'manages',
    'reported_to',
  ] as const,
};

/**
 * Copilot Fixtures
 */
export const copilotFixtures = {
  /**
   * Opens the copilot panel
   */
  openCopilot: async (page: Page) => {
    await page.click('[data-testid="copilot-toggle"]');
    await expect(page.locator('[data-testid="copilot-panel"]')).toBeVisible();
  },

  /**
   * Asks a question and waits for response
   */
  askQuestion: async (page: Page, question: string) => {
    const input = page.locator('[data-testid="copilot-question-input"]');
    await input.clear();
    await input.fill(question);
    await page.click('[data-testid="copilot-ask-button"]');

    // Wait for response
    await expect(
      page.locator('[data-testid="copilot-response"]'),
    ).toBeVisible({ timeout: 20000 });

    // Return response text
    const responseText = await page
      .locator('[data-testid="copilot-response"]')
      .textContent();
    return responseText || '';
  },

  /**
   * Verifies response contains expected entities
   */
  verifyResponseCitations: async (page: Page, expectedEntityIds: string[]) => {
    const citationsList = page.locator('[data-testid="response-citations"]');
    await expect(citationsList).toBeVisible();

    for (const entityId of expectedEntityIds) {
      await expect(citationsList).toContainText(entityId);
    }
  },

  /**
   * Verifies why paths are highlighted
   */
  verifyWhyPaths: async (page: Page, expectedEdgeIds: string[]) => {
    for (const edgeId of expectedEdgeIds) {
      await expect(
        page.locator(`[data-testid="edge-${edgeId}"]`),
      ).toHaveClass(/highlighted|why-path/);
    }
  },

  /**
   * Common investigation questions
   */
  questions: {
    connections: (entityA: string, entityB: string) =>
      `What connects ${entityA} to ${entityB}?`,
    timeline: (entity: string) =>
      `What is the timeline of events for ${entity}?`,
    relationships: (entity: string) =>
      `Who is ${entity} connected to and how?`,
    access: (resource: string) => `Who has access to ${resource}?`,
    influence: (entity: string) =>
      `Who has influence over ${entity}'s activities?`,
  },
};

/**
 * Authentication Fixtures
 */
export const authFixtures = {
  /**
   * Logs in with specific user role
   */
  loginAs: async (
    page: Page,
    role: 'admin' | 'analyst' | 'viewer' | 'operator',
  ) => {
    const credentials = {
      admin: {
        email: 'admin@test.intelgraph.ai',
        password: 'test-password-admin',
      },
      analyst: {
        email: 'analyst@test.intelgraph.ai',
        password: 'test-password-analyst',
      },
      viewer: {
        email: 'viewer@test.intelgraph.ai',
        password: 'test-password-viewer',
      },
      operator: {
        email: 'operator@test.intelgraph.ai',
        password: 'test-password-operator',
      },
    };

    const creds = credentials[role];

    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', creds.email);
    await page.fill('[data-testid="password-input"]', creds.password);
    await page.click('[data-testid="login-button"]');

    // Wait for successful login
    await expect(page).toHaveURL(/\/(dashboard|investigations|maestro)/);
  },

  /**
   * Logs out
   */
  logout: async (page: Page) => {
    await page.click('[data-testid="user-menu-button"]');
    await page.click('[data-testid="logout-button"]');
    await expect(page).toHaveURL('/login');
  },

  /**
   * Verifies access is denied
   */
  expectAccessDenied: async (page: Page) => {
    await expect(page.getByText('Access Denied')).toBeVisible();
  },
};

/**
 * Dashboard Fixtures
 */
export const dashboardFixtures = {
  /**
   * Navigates to dashboard
   */
  goToDashboard: async (page: Page) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText(/Dashboard|Overview/i);
  },

  /**
   * Verifies dashboard widgets are loaded
   */
  verifyWidgetsLoaded: async (page: Page) => {
    const widgets = [
      '[data-testid="recent-investigations-widget"]',
      '[data-testid="alerts-widget"]',
      '[data-testid="activity-widget"]',
      '[data-testid="stats-widget"]',
    ];

    for (const widget of widgets) {
      await expect(page.locator(widget)).toBeVisible({ timeout: 10000 });
    }
  },

  /**
   * Clicks on a recent investigation
   */
  openRecentInvestigation: async (page: Page, index: number = 0) => {
    await page
      .locator('[data-testid^="recent-investigation-"]')
      .nth(index)
      .click();
    await expect(
      page.locator('[data-testid="cytoscape-graph"]'),
    ).toBeVisible();
  },
};

/**
 * Graph Interaction Fixtures
 */
export const graphFixtures = {
  /**
   * Changes graph layout
   */
  changeLayout: async (page: Page, layout: 'force' | 'hierarchical' | 'circular' | 'grid') => {
    await page.click(`[data-testid="layout-${layout}"]`);
    await page.waitForTimeout(1000); // Allow layout to settle
  },

  /**
   * Zooms the graph
   */
  zoom: async (page: Page, direction: 'in' | 'out' | 'fit') => {
    await page.click(`[data-testid="zoom-${direction}"]`);
    await page.waitForTimeout(500);
  },

  /**
   * Filters graph by entity type
   */
  filterByType: async (page: Page, type: string) => {
    await page.click('[data-testid="filter-menu-button"]');
    await page.click(`[data-testid="filter-type-${type.toLowerCase()}"]`);
    await page.waitForTimeout(500);
  },

  /**
   * Searches for entity in graph
   */
  searchEntity: async (page: Page, searchTerm: string) => {
    await page.fill('[data-testid="graph-search-input"]', searchTerm);
    await page.waitForTimeout(500);
  },
};

/**
 * Wait Utilities
 */
export const waitUtils = {
  /**
   * Waits for GraphQL query to complete
   */
  waitForGraphQL: async (page: Page, operationName: string) => {
    await page.waitForResponse(
      (response) =>
        response.url().includes('/graphql') &&
        response.request().postDataJSON()?.operationName === operationName,
      { timeout: 15000 },
    );
  },

  /**
   * Waits for graph to fully render
   */
  waitForGraph: async (page: Page) => {
    await expect(
      page.locator('[data-testid="cytoscape-graph"]'),
    ).toBeVisible();
    await page.waitForTimeout(1000); // Additional time for rendering
  },

  /**
   * Waits for toast notification
   */
  waitForToast: async (page: Page, expectedText?: string) => {
    const toast = page.locator('[data-testid="toast-notification"]');
    await expect(toast).toBeVisible();

    if (expectedText) {
      await expect(toast).toContainText(expectedText);
    }

    return toast;
  },
};

/**
 * Accessibility Utilities
 */
export const a11yUtils = {
  /**
   * Verifies keyboard navigation works
   */
  testKeyboardNavigation: async (page: Page, elements: string[]) => {
    for (const element of elements) {
      await page.keyboard.press('Tab');
      await expect(page.locator(element)).toBeFocused();
    }
  },

  /**
   * Verifies ARIA labels are present
   */
  verifyAriaLabels: async (page: Page, selectors: string[]) => {
    for (const selector of selectors) {
      const element = page.locator(selector);
      await expect(element).toHaveAttribute('aria-label', /.+/);
    }
  },

  /**
   * Tests screen reader announcements
   */
  verifyLiveRegion: async (page: Page, expectedText: string) => {
    const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]');
    await expect(liveRegion).toContainText(expectedText);
  },
};

/**
 * Performance Utilities
 */
export const perfUtils = {
  /**
   * Measures page load time
   */
  measurePageLoad: async (page: Page, url: string) => {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    return { loadTime, url };
  },

  /**
   * Measures GraphQL response time
   */
  measureGraphQLResponse: async (
    page: Page,
    operationName: string,
    triggerFn: () => Promise<void>,
  ) => {
    const startTime = Date.now();

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/graphql') &&
        response.request().postDataJSON()?.operationName === operationName,
    );

    await triggerFn();
    await responsePromise;

    const responseTime = Date.now() - startTime;

    return { responseTime, operationName };
  },

  /**
   * Logs performance metrics
   */
  logMetrics: (metrics: Record<string, number>) => {
    console.log('Performance Metrics:');
    for (const [key, value] of Object.entries(metrics)) {
      console.log(`  - ${key}: ${value}ms`);
    }
  },
};

/**
 * Data Factory - generates test data
 */
export const dataFactory = {
  investigation: (overrides?: Partial<Investigation>) => ({
    id: `test-inv-${Date.now()}`,
    name: `Test Investigation ${Date.now()}`,
    description: 'Auto-generated test investigation',
    classification: 'UNCLASSIFIED',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  entity: (overrides?: Partial<Entity>) => ({
    id: `test-entity-${Date.now()}`,
    name: `Test Entity ${Date.now()}`,
    type: 'Person',
    properties: {},
    ...overrides,
  }),

  relationship: (overrides?: Partial<Relationship>) => ({
    id: `test-rel-${Date.now()}`,
    sourceId: '',
    targetId: '',
    type: 'works_with',
    properties: {},
    ...overrides,
  }),
};

/**
 * Type definitions
 */
interface Investigation {
  id: string;
  name: string;
  description: string;
  classification: string;
  status: string;
  createdAt: string;
}

interface Entity {
  id: string;
  name: string;
  type: string;
  properties: Record<string, unknown>;
}

interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  properties: Record<string, unknown>;
}

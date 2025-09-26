import React from 'react';
import type { Step } from 'react-joyride';

export const INGEST_WIZARD_TOUR_KEY = 'ingest-wizard';
export const QUERY_BUILDER_TOUR_KEY = 'query-builder';

export const ingestWizardSteps: Step[] = [
  {
    target: '[data-tour-id="ingest-wizard-title"]',
    title: 'Guided ingest setup',
    content: (
      <div>
        <p>
          This dialog walks you through importing new intelligence data and configuring Copilot
          analysis. We will highlight the key controls so you can safely follow along with a screen
          reader.
        </p>
      </div>
    ),
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour-id="ingest-wizard-demo-toggle"]',
    title: 'Demo mode shortcut',
    content: (
      <div>
        <p>
          Turn on demo mode to auto-populate sample data. This is helpful for training sessions and
          keeps production tenants untouched.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour-id="ingest-wizard-progress"]',
    title: 'Track your progress',
    content: (
      <div>
        <p>
          The progress bar and step list update as you finish each action. They provide real-time
          feedback for assistive technologies via polite announcements.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour-id="ingest-wizard-action"]',
    title: 'Complete each task',
    content: (
      <div>
        <p>
          Follow the instructions in this panel to add entities, upload files, and launch Copilot.
          Each step validates inputs so you can confidently move forward.
        </p>
      </div>
    ),
    placement: 'top',
  },
];

export const queryBuilderSteps: Step[] = [
  {
    target: '[data-tour-id="query-builder-card"]',
    title: 'Flexible query builder',
    content: (
      <div>
        <p>
          Build complex search filters with chips or using the accessible quick search field. All
          controls support keyboard navigation.
        </p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour-id="query-builder-dsl"]',
    title: 'Keyboard friendly input',
    content: (
      <div>
        <p>
          Type structured filters such as <code>status:active</code> and press Enter to convert them
          into chips instantly.
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour-id="query-builder-fields"]',
    title: 'Pick fields and operators',
    content: (
      <div>
        <p>
          Use the dropdowns to choose a field and operator. These components announce their labels
          and support arrow key navigation for WCAG 2.1 compliance.
        </p>
      </div>
    ),
  },
  {
    target: '[data-tour-id="query-builder-chips"]',
    title: 'Review active filters',
    content: (
      <div>
        <p>
          All active filters appear as chips that you can remove with a keyboard or pointer. The
          status text updates politely so screen readers stay in sync.
        </p>
      </div>
    ),
    placement: 'top',
  },
];

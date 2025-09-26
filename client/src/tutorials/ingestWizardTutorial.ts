import type { Step } from 'intro.js';

export const ingestWizardSteps: Step[] = [
  {
    element: '#ingest-wizard-progress',
    title: 'Track your progress',
    intro:
      'The progress bar shows how far you are through the ingest workflow. Each step unlocks new tooling as you advance.',
  },
  {
    element: '#ingest-wizard-stepper',
    title: 'Follow the five-step plan',
    intro:
      'Move from investigation setup through data import and analysis. Completed steps are marked in green so you always know what is next.',
  },
  {
    element: '#ingest-wizard-demo-toggle',
    title: 'Use demo data when needed',
    intro:
      'Turn on Demo Mode to instantly populate example investigations—perfect for first-time users or quick demos.',
  },
  {
    element: '#ingest-wizard-active-step',
    title: 'Complete guided actions',
    intro:
      'Each step contains contextual tasks, tips, and validation. Work through them sequentially or jump ahead when you are ready.',
  },
  {
    element: '#ingest-wizard-help-button',
    title: 'Access help at any point',
    intro:
      'Need a refresher? Open the help panel for documentation, shortcuts, and direct links into the knowledge base.',
  },
];

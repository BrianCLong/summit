export interface TutorialMetadata {
  id: string;
  title: string;
  description: string;
  featureArea: string;
  estimatedTime: string;
}

export const TUTORIAL_CONFIG: Record<string, TutorialMetadata> = {
  'ingest-wizard': {
    id: 'ingest-wizard',
    title: 'Data Ingest Wizard Tour',
    description:
      'Learn how to configure sources, import entities, and launch AI analysis with the guided ingest wizard.',
    featureArea: 'Data Onboarding',
    estimatedTime: '3 minutes',
  },
  'graph-query': {
    id: 'graph-query',
    title: 'Graph Querying Tour',
    description:
      'Discover how to ask natural language questions, reuse query history, and interpret results in the graph workbench.',
    featureArea: 'Graph Analysis',
    estimatedTime: '2 minutes',
  },
};

export type TutorialId = keyof typeof TUTORIAL_CONFIG;

export const DEFAULT_TUTORIAL_IDS: TutorialId[] = Object.keys(TUTORIAL_CONFIG) as TutorialId[];

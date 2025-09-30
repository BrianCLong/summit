// Map friendly IDs → dynamic imports
export const DECKS = {
  'Quarterly Review': () => import('./QuarterlyReview.mdx'),
  'Roadmap v0.1': () => import('./RoadmapV01.mdx'),
  'Incident Postmortem': () => import('./IncidentPostmortem.mdx'),
};

export function listDecks() {
  return Object.keys(DECKS);
}
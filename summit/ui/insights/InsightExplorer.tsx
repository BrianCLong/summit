import type { InsightRecord } from './InsightFeed';

interface InsightExplorerProps {
  insights: InsightRecord[];
}

export function InsightExplorer({ insights }: InsightExplorerProps) {
  const threats = insights.filter((insight) => insight.severity === 'high' || insight.severity === 'critical');

  return (
    <section aria-label="insight-explorer">
      <h3>Emerging Threat Explorer</h3>
      <p>High-risk insights: {threats.length}</p>
    </section>
  );
}

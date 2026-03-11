export interface InsightRecord {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sourceEngine: 'intelgraph-pattern-miner' | 'evolution-intelligence' | 'threat-intelligence';
  summary: string;
}

interface InsightFeedProps {
  insights: InsightRecord[];
}

export function InsightFeed({ insights }: InsightFeedProps) {
  return (
    <section aria-label="insight-feed">
      <h2>Automated Insight Feed</h2>
      <p>Insights discovered: {insights.length}</p>
    </section>
  );
}

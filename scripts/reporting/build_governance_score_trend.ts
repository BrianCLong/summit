import fs from 'fs';
import path from 'path';

// Interfaces (subset for trend)
interface ScoreResult {
  score_total: number;
  grade: string;
  determinism_metadata: {
    timestamp?: string; // If present
  };
  breakdown: { component_id: string; achieved: number }[];
  reasons: { code: string }[];
}

interface TrendEntry {
  date: string; // ISO date
  runId: string;
  score: number;
  grade: string;
  delta?: number;
}

interface TrendOutput {
  history: TrendEntry[];
  latest: TrendEntry;
  component_deltas: Record<string, number>; // Component ID -> Delta
  top_recurring_reasons: { code: string; count: number }[];
}

const DIST_COMPLIANCE = path.join(process.cwd(), 'dist/compliance');
const SCORE_FILE = path.join(DIST_COMPLIANCE, 'governance-score.json');
const TREND_FILE = path.join(DIST_COMPLIANCE, 'governance-score-trend.json');
const TREND_MD_FILE = path.join(DIST_COMPLIANCE, 'governance-score-trend.md');

// Mock function to retrieve historical scores
// In a real CI environment, this would download artifacts from previous builds.
// Here we will simulate "downloading" by checking if a trend file already exists and appending to it.
function getHistoricalTrend(): TrendOutput {
  if (fs.existsSync(TREND_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(TREND_FILE, 'utf8'));
    } catch (e) {
      console.warn('Failed to parse existing trend file, starting fresh.');
    }
  }
  return { history: [], latest: { date: '', runId: '', score: 0, grade: 'F' }, component_deltas: {}, top_recurring_reasons: [] };
}

function buildTrend() {
  console.log('Building Governance Score Trend...');

  if (!fs.existsSync(SCORE_FILE)) {
    console.error(`Current score file missing at ${SCORE_FILE}`);
    process.exit(1);
  }

  const currentScore: ScoreResult = JSON.parse(fs.readFileSync(SCORE_FILE, 'utf8'));
  const currentTrendData: TrendEntry = {
    date: new Date().toISOString().split('T')[0],
    runId: process.env.GITHUB_RUN_ID || 'local',
    score: currentScore.score_total,
    grade: currentScore.grade,
  };

  const trend = getHistoricalTrend();

  // Calculate Delta
  const previousScore = trend.latest.score || 0; // Default to 0 if first run
  // Only calculate delta if there is history
  if (trend.history.length > 0) {
      currentTrendData.delta = currentScore.score_total - trend.latest.score;
  } else {
      currentTrendData.delta = 0;
  }

  // Add current to history
  // Avoid duplicates if running multiple times locally on same day/run?
  // For simplicity, just append.
  trend.history.push(currentTrendData);

  // Keep last N (e.g., 50)
  if (trend.history.length > 50) {
      trend.history = trend.history.slice(-50);
  }

  trend.latest = currentTrendData;

  // Component deltas (would require previous breakdown, omitted for simplicity unless we store full previous result)
  // For this implementation, I'll just placeholder it.
  trend.component_deltas = {};

  // Top recurring reasons
  // Aggregate from history if we stored reasons in history. We didn't in the simplified TrendEntry.
  // So we just list current reasons.
  const reasonCounts: Record<string, number> = {};
  currentScore.reasons.forEach(r => {
      reasonCounts[r.code] = (reasonCounts[r.code] || 0) + 1;
  });
  trend.top_recurring_reasons = Object.entries(reasonCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);

  // Write outputs
  fs.writeFileSync(TREND_FILE, JSON.stringify(trend, null, 2));

  // Generate MD
  const trendMd = `# Governance Score Trend

**Latest Score:** ${currentTrendData.score} (${currentTrendData.grade})
**Delta:** ${currentTrendData.delta && currentTrendData.delta > 0 ? '+' : ''}${currentTrendData.delta}

## History (Last 5)
| Date | Run ID | Score | Grade | Delta |
|------|--------|-------|-------|-------|
${trend.history.slice(-5).reverse().map(h => `| ${h.date} | ${h.runId} | ${h.score} | ${h.grade} | ${h.delta !== undefined ? h.delta : '-'} |`).join('\n')}

## Top Detractors (Current)
${trend.top_recurring_reasons.map(r => `- ${r.code}`).join('\n')}
`;
  fs.writeFileSync(TREND_MD_FILE, trendMd);

  console.log(`Trend built. Output written to ${DIST_COMPLIANCE}`);
}

buildTrend();

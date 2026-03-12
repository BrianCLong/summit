import { processFeedback, FeedbackSignals } from '@intelgraph/agents';

/**
 * Triggered daily to process trial metrics and generate insights.
 * Trial metrics → insight graph.
 */
export async function dailyTrialMetricsWorkflow(tenantId: string) {
  console.log(`Starting daily trial metrics workflow for tenant: ${tenantId}`);

  // Simulated trial metrics retrieval
  // In production, this would fetch from an analytics service
  const signals: FeedbackSignals = {
    usageAnomalies: [{ type: 'latency-spike', value: 2000 }],
    featureRequests: ['Auto-scaling for agents'],
    driftFalsePositives: [],
    churnRisk: 0.4
  };

  const result = await processFeedback(tenantId, signals);
  console.log('Daily insight generated:', result);
  return result;
}

/**
 * Triggered when an upsell is rejected.
 * Upsell reject → "why?" survey → issue.
 */
export async function upsellRejectWorkflow(tenantId: string, reason: string) {
  console.log(`Starting upsell reject workflow for tenant: ${tenantId}. Reason: ${reason}`);

  // Trigger "why?" survey simulation
  const surveyResult = await triggerSurvey(tenantId, 'upsell-reject', reason);

  const signals: FeedbackSignals = {
    usageAnomalies: [],
    featureRequests: [surveyResult.missingFeature],
    driftFalsePositives: [],
    churnRisk: 0.8 // High risk if upsell rejected due to missing feature
  };

  const insight = await processFeedback(tenantId, signals);

  // Create GitHub issue for high priority insights
  if (insight.data.priority === 'high') {
    await createGitHubIssue(
      `Roadmap Gap: ${surveyResult.missingFeature} (from tenant ${tenantId})`,
      `Summary: ${insight.data.summary}\nRecommendation: ${insight.data.recommendation}`
    );
  }

  return insight;
}

/**
 * Roadmap: Top insights → GitHub issue/PR scaffold.
 * Simulated roadmap bump based on insights.
 */
export async function roadmapEvolutionWorkflow() {
  // Retrieve top insights from IntelGraph and create PR scaffolds or Issues
  console.log('Running roadmap evolution workflow...');

  // In production, this would query IntelGraph for the most frequent/high-priority insights
  const topInsights = [
    { type: 'feature-request', summary: 'Multi-agent orchestration', count: 5 }
  ];

  for (const insight of topInsights) {
    await createGitHubIssue(
      `Top req: ${insight.summary} from ${insight.count} tenants.`,
      `Proposed roadmap item based on automated feedback loop analysis.`
    );
  }
}

// Helpers
async function triggerSurvey(tenantId: string, type: string, context: string) {
  // Simulate sending and receiving a survey
  return { missingFeature: 'Multi-cloud support' };
}

async function createGitHubIssue(title: string, body: string) {
  console.log(`Creating GitHub issue: ${title}`);
  // In production, this would use the GitHub API via GitHubClient
  const issueNumber = Math.floor(Math.random() * 9000) + 1000;
  return {
    number: issueNumber,
    link: `https://github.com/BrianCLong/summit/issues/${issueNumber}`
  };
}

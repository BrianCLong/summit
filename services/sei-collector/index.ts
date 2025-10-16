import express from 'express';
import { Octokit } from '@octokit/rest';
import { logger } from '../../server/utils/logger';
import { DORAMetricsCollector } from './doraMetrics';
import { PRHealthBot } from './prHealthBot';
import { SPACEMetricsCollector } from './spaceMetrics';

const app = express();
const port = process.env.SEI_COLLECTOR_PORT || 8080;

app.use(express.json());

// Initialize collectors
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const doraCollector = new DORAMetricsCollector(octokit);
const spaceCollector = new SPACEMetricsCollector(octokit);
const prHealthBot = new PRHealthBot(octokit);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// GitHub webhook endpoint
app.post('/webhook/github', async (req, res) => {
  try {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    logger.info('GitHub webhook received', {
      event,
      action: payload.action,
      repository: payload.repository?.full_name,
    });

    // Process different event types
    switch (event) {
      case 'pull_request':
        await handlePullRequestEvent(payload);
        break;
      case 'push':
        await handlePushEvent(payload);
        break;
      case 'deployment':
        await handleDeploymentEvent(payload);
        break;
      case 'workflow_run':
        await handleWorkflowEvent(payload);
        break;
      default:
        logger.debug('Unhandled GitHub event', { event });
    }

    res.sendStatus(204);
  } catch (error: any) {
    logger.error('Webhook processing failed', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handlePullRequestEvent(payload: any) {
  const { action, pull_request: pr, repository } = payload;

  await doraCollector.processPREvent(action, pr, repository);
  await spaceCollector.processPREvent(action, pr, repository);

  // PR Health Bot analysis for opened/synchronize events
  if (['opened', 'synchronize'].includes(action)) {
    await prHealthBot.analyzePR(pr, repository);
  }
}

async function handlePushEvent(payload: any) {
  const { ref, repository, commits } = payload;

  await doraCollector.processPushEvent(ref, repository, commits);
  await spaceCollector.processPushEvent(ref, repository, commits);
}

async function handleDeploymentEvent(payload: any) {
  const { deployment, repository } = payload;

  await doraCollector.processDeploymentEvent(deployment, repository);
}

async function handleWorkflowEvent(payload: any) {
  const { workflow_run: workflow, repository } = payload;

  await doraCollector.processWorkflowEvent(workflow, repository);
  await spaceCollector.processWorkflowEvent(workflow, repository);
}

// API endpoints for metrics
app.get('/metrics/dora', async (req, res) => {
  try {
    const repo = req.query.repo as string;
    const timeframe = (req.query.timeframe as string) || '7d';

    const metrics = await doraCollector.getDORAMetrics(repo, timeframe);
    res.json(metrics);
  } catch (error: any) {
    logger.error('Failed to get DORA metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve DORA metrics' });
  }
});

app.get('/metrics/space', async (req, res) => {
  try {
    const repo = req.query.repo as string;
    const timeframe = (req.query.timeframe as string) || '7d';

    const metrics = await spaceCollector.getSPACEMetrics(repo, timeframe);
    res.json(metrics);
  } catch (error: any) {
    logger.error('Failed to get SPACE metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve SPACE metrics' });
  }
});

app.get('/dash/kpis', (req, res) => {
  // Mock KPI dashboard data - in production would query actual data
  res.json({
    leadTimeHours: 12.4,
    deploysPerDay: 5.2,
    mttrHours: 0.8,
    changeFailureRate: 8.5,
    testFlakeRate: 1.2,
    prSuccessRate: 94.5,
    autonomousPRsPerWeek: 8,
    llmCostPerPR: 3.45,
    pipelineP95Minutes: 14.2,
  });
});

// PR Health endpoint
app.get('/pr-health/:owner/:repo/:number', async (req, res) => {
  try {
    const { owner, repo, number } = req.params;
    const health = await prHealthBot.getPRHealth(owner, repo, parseInt(number));
    res.json(health);
  } catch (error: any) {
    logger.error('Failed to get PR health', { error: error.message });
    res.status(500).json({ error: 'Failed to get PR health' });
  }
});

// Weekly learning pack generation
app.post('/learning-pack/generate', async (req, res) => {
  try {
    const timeframe = req.body.timeframe || '7d';
    const learningPack = await generateWeeklyLearningPack(timeframe);
    res.json(learningPack);
  } catch (error: any) {
    logger.error('Failed to generate learning pack', { error: error.message });
    res.status(500).json({ error: 'Failed to generate learning pack' });
  }
});

async function generateWeeklyLearningPack(timeframe: string) {
  const doraMetrics = await doraCollector.getDORAMetrics('all', timeframe);
  const spaceMetrics = await spaceCollector.getSPACEMetrics('all', timeframe);

  return {
    title: `Weekly Learning Pack - ${new Date().toISOString().split('T')[0]}`,
    summary: {
      totalPRs: doraMetrics.totalPRs || 0,
      deployments: doraMetrics.deploymentFrequency || 0,
      leadTime: doraMetrics.leadTimeForChanges || 0,
      failureRate: doraMetrics.changeFailureRate || 0,
      satisfaction: spaceMetrics.satisfaction || 0,
    },
    insights: [
      {
        category: 'Performance',
        finding: `Lead time for changes: ${doraMetrics.leadTimeForChanges}h (target: <24h)`,
        recommendation:
          doraMetrics.leadTimeForChanges > 24
            ? 'Focus on reducing PR review time and CI pipeline duration'
            : 'Maintain current velocity',
      },
      {
        category: 'Quality',
        finding: `Change failure rate: ${doraMetrics.changeFailureRate}%`,
        recommendation:
          doraMetrics.changeFailureRate > 15
            ? 'Increase test coverage and review rigor'
            : 'Good quality gate effectiveness',
      },
      {
        category: 'Efficiency',
        finding: `${spaceMetrics.activity?.commitsPerDev || 0} commits/dev/week`,
        recommendation: 'Consistent development activity observed',
      },
    ],
    topFailures: await getTopFailures(timeframe),
    costSpikes: await getCostSpikes(timeframe),
    bestPractices: [
      'Use conventional commits for better release automation',
      'Leverage build caching to reduce CI time by 40%',
      'Implement feature flags for safer deployments',
    ],
    proposedBacklogItems: [
      'Implement automated dependency updates',
      'Add performance regression detection',
      'Create self-healing test suite',
    ],
  };
}

async function getTopFailures(timeframe: string) {
  // Mock failure analysis - in production would query actual failure data
  return [
    {
      type: 'Test Failure',
      count: 12,
      pattern: 'Database connection timeout in integration tests',
      suggestion: 'Add retry logic and connection pooling',
    },
    {
      type: 'Build Failure',
      count: 8,
      pattern: 'TypeScript compilation errors in CI',
      suggestion: 'Enable strict mode locally to catch issues earlier',
    },
  ];
}

async function getCostSpikes(timeframe: string) {
  // Mock cost analysis - in production would query actual cost data
  return [
    {
      date: '2024-01-15',
      cost: 45.67,
      reason: 'Heavy LLM usage during code review',
      suggestion: 'Optimize prompt templates to reduce token usage',
    },
  ];
}

app.listen(port, () => {
  logger.info(`SEI Collector running on port ${port}`);
});

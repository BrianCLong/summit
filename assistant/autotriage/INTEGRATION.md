# Integration Guide

Comprehensive guide for integrating the autotriage engine with your workflows, tools, and infrastructure.

## Table of Contents

1. [Quick Integration](#quick-integration)
2. [CI/CD Integration](#cicd-integration)
3. [Slack Integration](#slack-integration)
4. [GitHub Actions Integration](#github-actions-integration)
5. [API Integration](#api-integration)
6. [Monitoring Integration](#monitoring-integration)
7. [Custom Workflows](#custom-workflows)

## Quick Integration

### As a Node.js Module

```typescript
import { parseBacklog, generateTriageReport } from '@summit/autotriage';

// Use in your existing code
const items = await parseBacklog();
const report = generateTriageReport(items, [], 10, 10);
```

### As a CLI Tool

```bash
# Add to your existing scripts
./scripts/autotriage.sh triage --output weekly-report.md
```

### As a Git Hook

Add to `.git/hooks/pre-push`:

```bash
#!/bin/bash
# Auto-triage before pushing
./scripts/autotriage.sh triage --quiet --output /tmp/triage.txt

# Check for new blockers
BLOCKERS=$(grep -c "🚨 blocker" /tmp/triage.txt || echo 0)
if [ "$BLOCKERS" -gt 10 ]; then
  echo "Warning: $BLOCKERS blocker issues detected!"
  read -p "Continue push? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/triage.yml`:

```yaml
name: Auto Triage

on:
  schedule:
    # Run every Monday at 9 AM UTC
    - cron: '0 9 * * 1'
  workflow_dispatch: # Allow manual trigger

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd assistant/autotriage
          npm install

      - name: Build autotriage
        run: |
          cd assistant/autotriage
          npm run build

      - name: Run triage
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          ./scripts/autotriage.sh triage \
            --github \
            --all \
            --output triage-report.md

      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: triage-report
          path: triage-report.md

      - name: Post to Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "Weekly triage report available",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "📊 Weekly triage report generated.\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Results>"
                  }
                }
              ]
            }
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
triage:
  stage: deploy
  only:
    - schedules
  script:
    - cd assistant/autotriage
    - npm install
    - npm run build
    - cd ../..
    - ./scripts/autotriage.sh triage --github --output triage-report.md
  artifacts:
    paths:
      - triage-report.md
    expire_in: 1 week
```

### Jenkins

```groovy
pipeline {
    agent any

    triggers {
        cron('0 9 * * 1') // Weekly on Monday at 9 AM
    }

    environment {
        GITHUB_TOKEN = credentials('github-token')
    }

    stages {
        stage('Setup') {
            steps {
                dir('assistant/autotriage') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        stage('Run Triage') {
            steps {
                sh './scripts/autotriage.sh triage --github --all --output triage-report.md'
            }
        }

        stage('Archive') {
            steps {
                archiveArtifacts artifacts: 'triage-report.md'
            }
        }

        stage('Notify') {
            steps {
                slackSend(
                    color: 'good',
                    message: "Weekly triage report generated: ${env.BUILD_URL}"
                )
            }
        }
    }
}
```

## Slack Integration

### Post Results to Slack

```typescript
import { parseBacklog } from './assistant/autotriage/data/backlog-parser.js';

async function postToSlack() {
  const items = await parseBacklog();
  const blockers = items.filter(i => i.impact === 'blocker');

  const payload = {
    text: `🚨 ${blockers.length} blocker issues need attention`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Triage Alert*\n${blockers.length} blocker issues detected:`
        }
      },
      ...blockers.slice(0, 5).map(item => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• *${item.title}*\n  _${item.area.join(', ')}_`
        }
      }))
    ]
  };

  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
```

### Slack Bot Command

```typescript
// Slack bot handler
app.command('/triage', async ({ command, ack, respond }) => {
  await ack();

  const items = await parseBacklog();
  const report = generateTriageReport(items, [], 10, 10);

  await respond({
    response_type: 'in_channel',
    text: `Triage Summary: ${report.summary.totalItems} items, ${report.topIssues.length} high priority`
  });
});
```

## GitHub Actions Integration

### Auto-Label Issues

```typescript
// .github/scripts/auto-label.ts
import { Octokit } from '@octokit/rest';
import { fetchGitHubIssues } from './assistant/autotriage/data/github-fetcher.js';
import { generateBatchLabels } from './assistant/autotriage/automation/label-generator.js';

async function autoLabel() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const items = await fetchGitHubIssues({
    owner: 'BrianCLong',
    repo: 'summit',
    token: process.env.GITHUB_TOKEN,
    state: 'open',
    maxResults: 100
  });

  const labelSuggestions = generateBatchLabels(items);

  for (const suggestion of labelSuggestions) {
    if (suggestion.confidence > 0.7) {
      const issueNumber = parseInt(suggestion.issueId.replace('github-', ''));

      try {
        await octokit.issues.addLabels({
          owner: 'BrianCLong',
          repo: 'summit',
          issue_number: issueNumber,
          labels: suggestion.labels
        });

        console.log(`✓ Labeled #${issueNumber}`);
      } catch (error) {
        console.error(`✗ Failed to label #${issueNumber}:`, error);
      }
    }
  }
}

autoLabel();
```

### Create Weekly Triage Issue

```yaml
name: Weekly Triage Issue

on:
  schedule:
    - cron: '0 9 * * 1'

jobs:
  create-issue:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run triage
        run: |
          ./scripts/autotriage.sh triage --github --output triage.md

      - name: Create issue
        uses: peter-evans/create-issue-from-file@v4
        with:
          title: Weekly Triage Report - ${{ github.event.repository.updated_at }}
          content-filepath: triage.md
          labels: triage, automated
```

## API Integration

### Express.js API Endpoint

```typescript
import express from 'express';
import { parseBacklog, generateTriageReport } from '@summit/autotriage';

const app = express();

app.get('/api/triage', async (req, res) => {
  try {
    const items = await parseBacklog();
    const clusters = clusterIssues(items, defaultConfig.clustering);
    const report = generateTriageReport(items, clusters, 10, 10);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000);
```

### GraphQL API

```typescript
import { ApolloServer, gql } from 'apollo-server';
import { parseBacklog } from '@summit/autotriage';

const typeDefs = gql`
  type TriageItem {
    id: ID!
    title: String!
    impact: String!
    type: String!
    area: [String!]!
  }

  type Query {
    triageItems(impact: String): [TriageItem!]!
  }
`;

const resolvers = {
  Query: {
    triageItems: async (_: any, { impact }: any) => {
      const items = await parseBacklog();
      return impact ? items.filter(i => i.impact === impact) : items;
    }
  }
};

const server = new ApolloServer({ typeDefs, resolvers });
server.listen().then(({ url }) => console.log(`Server ready at ${url}`));
```

## Monitoring Integration

### Prometheus Metrics

```typescript
import { TriageMonitor } from './assistant/autotriage/monitoring.js';
import express from 'express';

const app = express();
const monitor = TriageMonitor.getInstance();

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(monitor.export('prometheus'));
});

app.listen(9090);
```

### DataDog Integration

```typescript
import { StatsD } from 'node-dogstatsd';
import { TriageMonitor } from './assistant/autotriage/monitoring.js';

const statsd = new StatsD();

class DataDogMonitor extends TriageMonitor {
  protected emitMetrics(metrics: TriageMetrics): void {
    statsd.gauge('autotriage.duration', metrics.duration || 0, {
      operation: metrics.operation
    });
    statsd.increment('autotriage.items_processed', metrics.itemsProcessed);
    statsd.increment('autotriage.errors', metrics.errorsEncountered);
  }

  protected emitError(error: ErrorEvent): void {
    statsd.increment('autotriage.error', 1, {
      operation: error.operation,
      severity: error.severity
    });
  }
}
```

### Sentry Integration

```typescript
import * as Sentry from '@sentry/node';
import { TriageMonitor } from './assistant/autotriage/monitoring.js';

Sentry.init({ dsn: process.env.SENTRY_DSN });

class SentryMonitor extends TriageMonitor {
  protected emitError(error: ErrorEvent): void {
    Sentry.captureException(new Error(error.error), {
      level: error.severity === 'critical' ? 'fatal' : 'error',
      tags: {
        operation: error.operation,
        recoverable: error.recoverable.toString()
      },
      extra: {
        context: error.context
      }
    });
  }
}
```

## Custom Workflows

### Jira Integration

```typescript
import JiraApi from 'jira-client';
import { parseBacklog } from '@summit/autotriage';

const jira = new JiraApi({
  protocol: 'https',
  host: 'your-domain.atlassian.net',
  username: process.env.JIRA_EMAIL,
  password: process.env.JIRA_API_TOKEN,
  apiVersion: '2',
  strictSSL: true
});

async function syncToJira() {
  const items = await parseBacklog();
  const blockers = items.filter(i => i.impact === 'blocker');

  for (const item of blockers) {
    await jira.addNewIssue({
      fields: {
        project: { key: 'PROJ' },
        summary: item.title,
        description: item.description,
        issuetype: { name: 'Bug' },
        priority: { name: 'Highest' },
        labels: item.area
      }
    });
  }
}
```

### Linear Integration

```typescript
import { LinearClient } from '@linear/sdk';
import { parseBacklog } from '@summit/autotriage';

const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

async function syncToLinear() {
  const items = await parseBacklog();

  for (const item of items) {
    await linear.createIssue({
      teamId: 'team-id',
      title: item.title,
      description: item.description,
      priority: mapImpactToPriority(item.impact),
      labelIds: await getOrCreateLabels(item.area)
    });
  }
}
```

### Email Digest

```typescript
import nodemailer from 'nodemailer';
import { parseBacklog, generateTriageReport, formatReportAsMarkdown } from '@summit/autotriage';

async function sendEmailDigest() {
  const items = await parseBacklog();
  const report = generateTriageReport(items, [], 10, 10);
  const markdown = formatReportAsMarkdown(report);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: 'autotriage@summit.dev',
    to: 'team@summit.dev',
    subject: 'Weekly Triage Report',
    text: markdown,
    html: markdownToHtml(markdown)
  });
}
```

## Best Practices

### Error Handling

```typescript
import { TriageMonitor } from './assistant/autotriage/monitoring.js';

const monitor = TriageMonitor.getInstance();

try {
  const items = await parseBacklog();
  // Process items...
} catch (error) {
  monitor.recordError('parseBacklog', error, undefined, 'high', false);
  // Fallback behavior...
}
```

### Rate Limiting

```typescript
import pLimit from 'p-limit';

const limit = pLimit(5); // Max 5 concurrent operations

const items = await Promise.all(
  sources.map(source =>
    limit(() => fetchFromSource(source))
  )
);
```

### Caching

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

async function getCachedTriageReport() {
  const cached = cache.get('triage-report');
  if (cached) return cached;

  const items = await parseBacklog();
  const report = generateTriageReport(items, [], 10, 10);

  cache.set('triage-report', report);
  return report;
}
```

## Troubleshooting

### Common Integration Issues

1. **Module not found errors**: Ensure all dependencies are installed
2. **Permission denied**: Check file permissions on scripts
3. **Rate limit errors**: Use GITHUB_TOKEN for higher limits
4. **Memory issues**: Process large repos in batches

### Debug Mode

```bash
# Enable verbose logging
DEBUG=autotriage:* ./scripts/autotriage.sh triage
```

### Health Check

```typescript
// Check if autotriage is working
async function healthCheck() {
  try {
    const items = await parseBacklog('./examples/sample-backlog.json');
    return items.length > 0;
  } catch (error) {
    return false;
  }
}
```

## Support

For integration help:
- Check the [README](./README.md) for basic usage
- Review [examples](./examples/) for code samples
- Open an issue on GitHub for bugs
- Contact the team for custom integrations

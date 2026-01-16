/**
 * Summit Work Graph - Multi-Platform Sync
 *
 * Syncs all work items across GitHub, Linear, Notion, and Jira.
 * Creates bidirectional links between all platforms.
 */

import { execSync } from 'node:child_process';

interface SyncConfig {
  linear?: {
    apiKey: string;
    teamId: string;
  };
  notion?: {
    apiKey: string;
    databaseId: string;
  };
  jira?: {
    host: string;
    email: string;
    apiToken: string;
    projectKey: string;
  };
}

interface WorkItem {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  milestone: string | null;
  labels: string[];
  storyPoints: number;
  acceptanceCriteria: string[];
  links: {
    github?: string;
    linear?: string;
    notion?: string;
    jira?: string;
  };
}

interface SyncResult {
  platform: string;
  success: boolean;
  created: number;
  updated: number;
  linked: number;
  errors: string[];
}

// Priority mapping across platforms
const PRIORITY_MAP = {
  github: { 'P0': 'critical', 'P1': 'high', 'P2': 'medium', 'P3': 'low' },
  linear: { 'P0': 1, 'P1': 2, 'P2': 3, 'P3': 4 }, // Linear: 1=Urgent, 2=High, 3=Medium, 4=Low
  notion: { 'P0': 'Critical', 'P1': 'High', 'P2': 'Medium', 'P3': 'Low' },
  jira: { 'P0': 'Highest', 'P1': 'High', 'P2': 'Medium', 'P3': 'Low' },
};

// Status mapping across platforms
const STATUS_MAP = {
  github: { 'backlog': 'open', 'in_progress': 'open', 'done': 'closed' },
  linear: { 'backlog': 'Backlog', 'in_progress': 'In Progress', 'done': 'Done' },
  notion: { 'backlog': 'Not Started', 'in_progress': 'In Progress', 'done': 'Done' },
  jira: { 'backlog': 'To Do', 'in_progress': 'In Progress', 'done': 'Done' },
};

// Type mapping
const TYPE_MAP = {
  linear: { 'bug': 'Bug', 'feature': 'Feature', 'task': 'Task', 'docs': 'Task' },
  jira: { 'bug': 'Bug', 'feature': 'Story', 'task': 'Task', 'docs': 'Task' },
};

class PlatformSync {
  private config: SyncConfig;

  constructor(config: SyncConfig) {
    this.config = config;
  }

  // Fetch all work items from GitHub
  async fetchGitHubItems(limit: number = 500): Promise<WorkItem[]> {
    console.log('📥 Fetching GitHub issues...');

    const issuesJson = execSync(
      `gh issue list --repo BrianCLong/summit --state all --limit ${limit} --json number,title,body,labels,milestone,state`,
      { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );

    const issues = JSON.parse(issuesJson) as Array<{
      number: number;
      title: string;
      body: string;
      labels: Array<{ name: string }>;
      milestone: { title: string } | null;
      state: string;
    }>;

    return issues.map(issue => ({
      id: `github-${issue.number}`,
      title: issue.title,
      description: issue.body || '',
      status: issue.state === 'closed' ? 'done' : 'backlog',
      priority: this.extractPriority(issue.labels.map(l => l.name)),
      type: this.extractType(issue.labels.map(l => l.name)),
      milestone: issue.milestone?.title || null,
      labels: issue.labels.map(l => l.name),
      storyPoints: this.extractStoryPoints(issue.body || ''),
      acceptanceCriteria: this.extractAcceptanceCriteria(issue.body || ''),
      links: {
        github: `https://github.com/BrianCLong/summit/issues/${issue.number}`,
      },
    }));
  }

  // Extract priority from labels
  private extractPriority(labels: string[]): string {
    for (const label of labels) {
      if (label.includes('P0') || label.includes('critical')) return 'P0';
      if (label.includes('P1') || label.includes('high')) return 'P1';
      if (label.includes('P2') || label.includes('medium')) return 'P2';
      if (label.includes('P3') || label.includes('low')) return 'P3';
    }
    return 'P2';
  }

  // Extract type from labels
  private extractType(labels: string[]): string {
    for (const label of labels) {
      if (label.includes('bug')) return 'bug';
      if (label.includes('feature')) return 'feature';
      if (label.includes('docs')) return 'docs';
    }
    return 'task';
  }

  // Extract story points from body
  private extractStoryPoints(body: string): number {
    const match = body.match(/\*\*Estimate:\*\*\s*(\d+)\s*points?/i);
    return match ? parseInt(match[1], 10) : 3;
  }

  // Extract acceptance criteria from body
  private extractAcceptanceCriteria(body: string): string[] {
    const match = body.match(/## Acceptance Criteria\n([\s\S]*?)(?=\n##|$)/);
    if (!match) return [];

    return match[1]
      .split('\n')
      .filter(line => line.trim().startsWith('- ['))
      .map(line => line.replace(/^- \[.\]\s*/, '').trim());
  }

  // Sync to Linear
  async syncToLinear(items: WorkItem[]): Promise<SyncResult> {
    const result: SyncResult = {
      platform: 'Linear',
      success: true,
      created: 0,
      updated: 0,
      linked: 0,
      errors: [],
    };

    if (!this.config.linear) {
      result.success = false;
      result.errors.push('Linear not configured');
      return result;
    }

    console.log('📤 Syncing to Linear...');

    const { apiKey, teamId } = this.config.linear;

    for (const item of items.slice(0, 50)) { // Limit for API rate limiting
      try {
        const linearPriority = PRIORITY_MAP.linear[item.priority as keyof typeof PRIORITY_MAP.linear] || 3;

        const mutation = `
          mutation CreateIssue($teamId: String!, $title: String!, $description: String, $priority: Int) {
            issueCreate(input: {
              teamId: $teamId
              title: $title
              description: $description
              priority: $priority
            }) {
              success
              issue {
                id
                identifier
                url
              }
            }
          }
        `;

        const response = await fetch('https://api.linear.app/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey,
          },
          body: JSON.stringify({
            query: mutation,
            variables: {
              teamId,
              title: item.title,
              description: `${item.description}\n\n---\n🔗 GitHub: ${item.links.github}`,
              priority: linearPriority,
            },
          }),
        });

        const data = await response.json();
        if (data.data?.issueCreate?.success) {
          result.created++;
          item.links.linear = data.data.issueCreate.issue.url;

          // Update GitHub issue with Linear link
          if (item.links.github) {
            const issueNumber = item.links.github.split('/').pop();
            execSync(
              `gh issue edit ${issueNumber} --repo BrianCLong/summit --add-label "synced:linear"`,
              { encoding: 'utf-8' }
            );
            result.linked++;
          }
        }
      } catch (error) {
        result.errors.push(`Failed to sync "${item.title}": ${error}`);
      }
    }

    console.log(`   ✓ Created ${result.created} issues in Linear`);
    return result;
  }

  // Sync to Notion
  async syncToNotion(items: WorkItem[]): Promise<SyncResult> {
    const result: SyncResult = {
      platform: 'Notion',
      success: true,
      created: 0,
      updated: 0,
      linked: 0,
      errors: [],
    };

    if (!this.config.notion) {
      result.success = false;
      result.errors.push('Notion not configured');
      return result;
    }

    console.log('📤 Syncing to Notion...');

    const { apiKey, databaseId } = this.config.notion;

    for (const item of items.slice(0, 50)) {
      try {
        const notionPriority = PRIORITY_MAP.notion[item.priority as keyof typeof PRIORITY_MAP.notion] || 'Medium';
        const notionStatus = STATUS_MAP.notion[item.status as keyof typeof STATUS_MAP.notion] || 'Not Started';

        const response = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Notion-Version': '2022-06-28',
          },
          body: JSON.stringify({
            parent: { database_id: databaseId },
            properties: {
              Name: { title: [{ text: { content: item.title } }] },
              Status: { select: { name: notionStatus } },
              Priority: { select: { name: notionPriority } },
              Type: { select: { name: item.type } },
              'Story Points': { number: item.storyPoints },
              'GitHub Link': { url: item.links.github },
              Sprint: item.milestone ? { select: { name: item.milestone } } : undefined,
            },
            children: [
              {
                object: 'block',
                type: 'heading_2',
                heading_2: { rich_text: [{ text: { content: 'Description' } }] },
              },
              {
                object: 'block',
                type: 'paragraph',
                paragraph: { rich_text: [{ text: { content: item.description.slice(0, 2000) } }] },
              },
              {
                object: 'block',
                type: 'heading_2',
                heading_2: { rich_text: [{ text: { content: 'Acceptance Criteria' } }] },
              },
              ...item.acceptanceCriteria.map(criteria => ({
                object: 'block' as const,
                type: 'to_do' as const,
                to_do: {
                  rich_text: [{ text: { content: criteria } }],
                  checked: false,
                },
              })),
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          result.created++;
          item.links.notion = `https://notion.so/${data.id.replace(/-/g, '')}`;

          // Update GitHub with Notion link
          if (item.links.github) {
            const issueNumber = item.links.github.split('/').pop();
            execSync(
              `gh issue edit ${issueNumber} --repo BrianCLong/summit --add-label "synced:notion"`,
              { encoding: 'utf-8' }
            );
            result.linked++;
          }
        }
      } catch (error) {
        result.errors.push(`Failed to sync "${item.title}": ${error}`);
      }
    }

    console.log(`   ✓ Created ${result.created} pages in Notion`);
    return result;
  }

  // Sync to Jira
  async syncToJira(items: WorkItem[]): Promise<SyncResult> {
    const result: SyncResult = {
      platform: 'Jira',
      success: true,
      created: 0,
      updated: 0,
      linked: 0,
      errors: [],
    };

    if (!this.config.jira) {
      result.success = false;
      result.errors.push('Jira not configured');
      return result;
    }

    console.log('📤 Syncing to Jira...');

    const { host, email, apiToken, projectKey } = this.config.jira;
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    for (const item of items.slice(0, 50)) {
      try {
        const jiraType = TYPE_MAP.jira[item.type as keyof typeof TYPE_MAP.jira] || 'Task';
        const jiraPriority = PRIORITY_MAP.jira[item.priority as keyof typeof PRIORITY_MAP.jira] || 'Medium';

        const response = await fetch(`https://${host}/rest/api/3/issue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`,
          },
          body: JSON.stringify({
            fields: {
              project: { key: projectKey },
              summary: item.title,
              description: {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: item.description.slice(0, 5000) }],
                  },
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: '🔗 GitHub: ' },
                      {
                        type: 'text',
                        text: item.links.github,
                        marks: [{ type: 'link', attrs: { href: item.links.github } }],
                      },
                    ],
                  },
                ],
              },
              issuetype: { name: jiraType },
              priority: { name: jiraPriority },
              labels: item.labels.slice(0, 10),
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          result.created++;
          item.links.jira = `https://${host}/browse/${data.key}`;

          // Update GitHub with Jira link
          if (item.links.github) {
            const issueNumber = item.links.github.split('/').pop();
            execSync(
              `gh issue edit ${issueNumber} --repo BrianCLong/summit --add-label "synced:jira"`,
              { encoding: 'utf-8' }
            );
            result.linked++;
          }
        }
      } catch (error) {
        result.errors.push(`Failed to sync "${item.title}": ${error}`);
      }
    }

    console.log(`   ✓ Created ${result.created} issues in Jira`);
    return result;
  }

  // Update GitHub issues with cross-platform links
  async updateGitHubLinks(items: WorkItem[]): Promise<void> {
    console.log('🔗 Updating GitHub issues with cross-platform links...');

    for (const item of items) {
      if (!item.links.github) continue;

      const issueNumber = item.links.github.split('/').pop();
      const links = [];

      if (item.links.linear) links.push(`- Linear: ${item.links.linear}`);
      if (item.links.notion) links.push(`- Notion: ${item.links.notion}`);
      if (item.links.jira) links.push(`- Jira: ${item.links.jira}`);

      if (links.length > 0) {
        const fs = await import('node:fs');
        const bodyAddition = `\n\n## Cross-Platform Links\n${links.join('\n')}`;

        try {
          // Get current body
          const currentBody = execSync(
            `gh issue view ${issueNumber} --repo BrianCLong/summit --json body --jq .body`,
            { encoding: 'utf-8' }
          ).trim();

          if (!currentBody.includes('## Cross-Platform Links')) {
            const newBody = currentBody + bodyAddition;
            const tempFile = `/tmp/issue_body_${issueNumber}.md`;
            fs.writeFileSync(tempFile, newBody);

            execSync(
              `gh issue edit ${issueNumber} --repo BrianCLong/summit --body-file "${tempFile}"`,
              { encoding: 'utf-8' }
            );
          }
        } catch (error) {
          console.error(`Failed to update links for #${issueNumber}`);
        }
      }
    }
  }

  // Full sync across all platforms
  async syncAll(limit: number = 100): Promise<void> {
    console.log('🚀 Starting full platform sync...\n');

    // Fetch items from GitHub
    const items = await this.fetchGitHubItems(limit);
    console.log(`   Found ${items.length} items to sync\n`);

    // Sync to each platform
    const results: SyncResult[] = [];

    if (this.config.linear) {
      results.push(await this.syncToLinear(items));
    }

    if (this.config.notion) {
      results.push(await this.syncToNotion(items));
    }

    if (this.config.jira) {
      results.push(await this.syncToJira(items));
    }

    // Update GitHub with cross-platform links
    await this.updateGitHubLinks(items);

    // Summary
    console.log('\n📊 Sync Summary:');
    for (const result of results) {
      console.log(`   ${result.platform}: ${result.created} created, ${result.linked} linked`);
      if (result.errors.length > 0) {
        console.log(`      ⚠ ${result.errors.length} errors`);
      }
    }
  }
}

// Export for use in other modules
export { PlatformSync, SyncConfig, WorkItem, SyncResult };

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: SyncConfig = {
    linear: process.env.LINEAR_API_KEY ? {
      apiKey: process.env.LINEAR_API_KEY,
      teamId: process.env.LINEAR_TEAM_ID || '',
    } : undefined,
    notion: process.env.NOTION_API_KEY ? {
      apiKey: process.env.NOTION_API_KEY,
      databaseId: process.env.NOTION_DATABASE_ID || '',
    } : undefined,
    jira: process.env.JIRA_API_TOKEN ? {
      host: process.env.JIRA_HOST || '',
      email: process.env.JIRA_EMAIL || '',
      apiToken: process.env.JIRA_API_TOKEN,
      projectKey: process.env.JIRA_PROJECT_KEY || '',
    } : undefined,
  };

  const sync = new PlatformSync(config);
  sync.syncAll(100).catch(console.error);
}

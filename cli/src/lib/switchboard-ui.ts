import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import { Server } from 'http';
import { detectRepoRoot } from './sandbox';

export async function startDashboard(port: number = 3000): Promise<Server> {
  const app = express();
  const repoRoot = detectRepoRoot();

  // Basic styling
  const style = `
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f4f4f9; }
    h1, h2 { color: #2c3e50; }
    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
    .warning { background: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 15px; border-radius: 4px; margin-bottom: 20px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; }
    .status-healthy { color: #28a745; font-weight: bold; }
    .status-error { color: #dc3545; font-weight: bold; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .tag-allow { background: #d4edda; color: #155724; }
    .tag-deny { background: #f8d7da; color: #721c24; }
    pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 13px; }
  `;

  app.get('/', async (_req, res) => {
    try {
      // 1. Get MCP Server status
      let mcpServers: any[] = [];
      try {
        const allowlistPath = path.join(repoRoot, 'mcp', 'allowlist.yaml');
        const content = await fs.readFile(allowlistPath, 'utf8');
        const config = yaml.parse(content);
        mcpServers = Object.entries(config.mcpServers || {}).map(([name, config]: [string, any]) => ({
          name,
          url: config.url || 'stdio',
          status: 'Healthy' // Placeholder until dynamic telemetry is added in PR 12
        }));
      } catch (e) {
        // Fallback or empty
      }

      // 2. Get recent tool executions and policy decisions from receipts
      const recentExecutions: any[] = [];
      const capsuleDir = path.join(repoRoot, '.switchboard', 'capsules');
      try {
        if (await fs.access(capsuleDir).then(() => true).catch(() => false)) {
          const entries = await fs.readdir(capsuleDir, { withFileTypes: true });
          const capsules = entries.filter(e => e.isDirectory());

          for (const capsule of capsules) {
            const ledgerPath = path.join(capsuleDir, capsule.name, 'ledger.jsonl');
            try {
              const content = await fs.readFile(ledgerPath, 'utf8');
              const lines = content.trim().split('\n');
              for (const line of lines) {
                if (!line) continue;
                const entry = JSON.parse(line);
                recentExecutions.push({
                  capsuleId: capsule.name,
                  ...entry
                });
              }
            } catch (e) {
              // Ignore missing or invalid ledgers
            }
          }
        }
      } catch (e) {
        // Error reading receipts
      }

      // Sort by timestamp descending
      recentExecutions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Render HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Switchboard Local Dashboard</title>
          <style>${style}</style>
        </head>
        <body>
          <div class="warning">
            ⚠️ WARNING: This is a read-only local dashboard (127.0.0.1). Do not expose to the internet.
          </div>
          <h1>Switchboard Local Dashboard</h1>

          <div class="card">
            <h2>MCP Servers Status</h2>
            <table>
              <thead>
                <tr>
                  <th>Server Name</th>
                  <th>URL/Transport</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${mcpServers.map(s => `
                  <tr>
                    <td>${s.name}</td>
                    <td><code>${s.url}</code></td>
                    <td class="status-healthy">${s.status}</td>
                  </tr>
                `).join('')}
                ${mcpServers.length === 0 ? '<tr><td colspan="3">No MCP servers configured.</td></tr>' : ''}
              </tbody>
            </table>
          </div>

          <div class="card">
            <h2>Recent Activity (Receipts & Decisions)</h2>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Type</th>
                  <th>Capsule ID</th>
                  <th>Decision/Tool</th>
                  <th>Result/Reason</th>
                </tr>
              </thead>
              <tbody>
                ${recentExecutions.slice(0, 50).map(e => {
                  if (e.type === 'preflight_decision') {
                    return `
                      <tr>
                        <td>${new Date(e.timestamp).toLocaleString()}</td>
                        <td><strong>Decision</strong></td>
                        <td><code>${e.capsuleId.slice(0, 8)}...</code></td>
                        <td><span class="tag tag-${e.decision.toLowerCase()}">${e.decision}</span></td>
                        <td>${e.reason || 'N/A'}</td>
                      </tr>
                    `;
                  } else if (e.type === 'tool_execution') {
                    return `
                      <tr>
                        <td>${new Date(e.timestamp).toLocaleString()}</td>
                        <td>Tool Exec</td>
                        <td><code>${e.capsuleId.slice(0, 8)}...</code></td>
                        <td><code>${e.tool}</code></td>
                        <td>${e.success ? '✅ Success' : '❌ Failed'}</td>
                      </tr>
                    `;
                  }
                  return '';
                }).join('')}
                ${recentExecutions.length === 0 ? '<tr><td colspan="5">No recent activity found in .switchboard/capsules/</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;
      res.send(html);
    } catch (error) {
      res.status(500).send(`Error rendering dashboard: ${error}`);
    }
  });

  return new Promise<Server>((resolve) => {
    const server = app.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

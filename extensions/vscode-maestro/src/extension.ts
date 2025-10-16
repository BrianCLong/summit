/**
 * VS Code Extension for Maestro Orchestration
 * Provides pipeline authoring, execution, and monitoring
 */

import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import * as yaml from 'js-yaml';
import * as WebSocket from 'ws';
import { readFileSync, existsSync } from 'fs';

interface MaestroRun {
  run_id: string;
  workflow_name: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  completed_at?: string;
  cost_usd?: number;
  tenant_id: string;
  environment: string;
}

interface MaestroStep {
  step_id: string;
  name: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  cost_usd?: number;
  error?: string;
}

class MaestroAPI {
  private client: AxiosInstance;
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;

    this.client = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'VSCode-Maestro/1.0.0',
      },
    });
  }

  async getRuns(): Promise<MaestroRun[]> {
    const response = await this.client.get('/api/v1/runs');
    return response.data.runs || [];
  }

  async getRun(runId: string): Promise<MaestroRun> {
    const response = await this.client.get(`/api/v1/runs/${runId}`);
    return response.data;
  }

  async getRunSteps(runId: string): Promise<MaestroStep[]> {
    const response = await this.client.get(`/api/v1/runs/${runId}/steps`);
    return response.data.steps || [];
  }

  async runPipeline(
    workflowPath: string,
    parameters: Record<string, any> = {},
  ): Promise<string> {
    const workflow = this.loadWorkflow(workflowPath);

    const response = await this.client.post('/api/v1/runs', {
      workflow,
      parameters,
      environment: vscode.workspace
        .getConfiguration('maestro')
        .get('defaultEnvironment', 'development'),
      triggered_by: 'vscode',
    });

    return response.data.run_id;
  }

  async cancelRun(runId: string): Promise<void> {
    await this.client.post(`/api/v1/runs/${runId}/cancel`);
  }

  private loadWorkflow(workflowPath: string): any {
    if (!existsSync(workflowPath)) {
      throw new Error(`Workflow file not found: ${workflowPath}`);
    }

    const content = readFileSync(workflowPath, 'utf8');
    return yaml.load(content);
  }

  createWebSocket(runId: string): WebSocket {
    const wsUrl =
      this.apiUrl.replace(/^http/, 'ws') + `/api/v1/runs/${runId}/stream`;
    return new WebSocket(wsUrl, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
  }
}

class MaestroRunsProvider implements vscode.TreeDataProvider<MaestroRunItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    MaestroRunItem | undefined | null | void
  > = new vscode.EventEmitter<MaestroRunItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    MaestroRunItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private runs: MaestroRun[] = [];
  private api: MaestroAPI;

  constructor(api: MaestroAPI) {
    this.api = api;
    this.refresh();
  }

  refresh(): void {
    this.api
      .getRuns()
      .then((runs) => {
        this.runs = runs;
        this._onDidChangeTreeData.fire();
      })
      .catch((error) => {
        console.error('Failed to refresh runs:', error);
        vscode.window.showErrorMessage(
          `Failed to refresh Maestro runs: ${error.message}`,
        );
      });
  }

  getTreeItem(element: MaestroRunItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: MaestroRunItem): Thenable<MaestroRunItem[]> {
    if (!element) {
      // Return top-level runs
      return Promise.resolve(
        this.runs.map(
          (run) =>
            new MaestroRunItem(
              run.run_id,
              `${run.workflow_name} (${run.status})`,
              run.status,
              vscode.TreeItemCollapsibleState.Collapsed,
              run,
            ),
        ),
      );
    } else {
      // Return steps for a run
      return this.api.getRunSteps(element.runId).then((steps) => {
        return steps.map(
          (step) =>
            new MaestroRunItem(
              step.step_id,
              `${step.name} (${step.status})`,
              step.status,
              vscode.TreeItemCollapsibleState.None,
              undefined,
              step,
            ),
        );
      });
    }
  }
}

class MaestroRunItem extends vscode.TreeItem {
  constructor(
    public readonly runId: string,
    public readonly label: string,
    public readonly status: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly run?: MaestroRun,
    public readonly step?: MaestroStep,
  ) {
    super(label, collapsibleState);

    this.tooltip = this.getTooltip();
    this.description = this.getDescription();
    this.iconPath = this.getIcon();
    this.contextValue = this.run ? 'maestroRun' : 'maestroStep';
  }

  private getTooltip(): string {
    if (this.run) {
      return `Run ID: ${this.run.run_id}\nStatus: ${this.run.status}\nEnvironment: ${this.run.environment}\nCost: $${this.run.cost_usd || 0}`;
    } else if (this.step) {
      return `Step: ${this.step.name}\nStatus: ${this.step.status}\nDuration: ${this.step.duration_ms || 0}ms\nCost: $${this.step.cost_usd || 0}`;
    }
    return '';
  }

  private getDescription(): string {
    if (this.run) {
      const cost = this.run.cost_usd ? `$${this.run.cost_usd.toFixed(3)}` : '';
      const duration =
        this.run.completed_at && this.run.created_at
          ? `${Math.round((new Date(this.run.completed_at).getTime() - new Date(this.run.created_at).getTime()) / 1000)}s`
          : '';
      return [cost, duration].filter(Boolean).join(' • ');
    } else if (this.step) {
      const duration = this.step.duration_ms
        ? `${this.step.duration_ms}ms`
        : '';
      const cost = this.step.cost_usd
        ? `$${this.step.cost_usd.toFixed(4)}`
        : '';
      return [duration, cost].filter(Boolean).join(' • ');
    }
    return '';
  }

  private getIcon(): vscode.ThemeIcon {
    const statusIcons = {
      running: new vscode.ThemeIcon('loading~spin'),
      completed: new vscode.ThemeIcon(
        'check',
        new vscode.ThemeColor('charts.green'),
      ),
      succeeded: new vscode.ThemeIcon(
        'check',
        new vscode.ThemeColor('charts.green'),
      ),
      failed: new vscode.ThemeIcon(
        'error',
        new vscode.ThemeColor('charts.red'),
      ),
      cancelled: new vscode.ThemeIcon(
        'circle-slash',
        new vscode.ThemeColor('charts.yellow'),
      ),
      pending: new vscode.ThemeIcon('clock'),
      default: new vscode.ThemeIcon('circle-outline'),
    };

    return (
      statusIcons[this.status as keyof typeof statusIcons] ||
      statusIcons.default
    );
  }
}

class MaestroLogOutputChannel {
  private outputChannel: vscode.OutputChannel;

  constructor(name: string) {
    this.outputChannel = vscode.window.createOutputChannel(name);
  }

  show(): void {
    this.outputChannel.show();
  }

  clear(): void {
    this.outputChannel.clear();
  }

  append(message: string): void {
    this.outputChannel.append(message);
  }

  appendLine(message: string): void {
    this.outputChannel.appendLine(message);
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('maestro');
  const apiUrl = config.get<string>('apiUrl', 'http://localhost:4000');
  const apiKey = config.get<string>('apiKey', '');

  if (!apiKey) {
    vscode.window.showWarningMessage(
      'Maestro API key not configured. Please set maestro.apiKey in settings.',
    );
  }

  const api = new MaestroAPI(apiUrl, apiKey);
  const provider = new MaestroRunsProvider(api);
  const treeView = vscode.window.createTreeView('maestroRuns', {
    treeDataProvider: provider,
  });

  // Auto-refresh
  const autoRefresh = config.get<boolean>('autoRefresh', true);
  const refreshInterval = config.get<number>('refreshInterval', 5000);

  if (autoRefresh) {
    const refreshTimer = setInterval(() => {
      provider.refresh();
    }, refreshInterval);

    context.subscriptions.push({
      dispose: () => clearInterval(refreshTimer),
    });
  }

  // Commands
  const runPipelineCommand = vscode.commands.registerCommand(
    'maestro.runPipeline',
    async () => {
      try {
        // Find maestro.yaml files in workspace
        const files = await vscode.workspace.findFiles(
          '**/*.maestro.{yaml,yml}',
          '**/node_modules/**',
        );

        if (files.length === 0) {
          vscode.window.showErrorMessage(
            'No Maestro pipeline files found in workspace',
          );
          return;
        }

        let selectedFile: vscode.Uri;

        if (files.length === 1) {
          selectedFile = files[0];
        } else {
          const items = files.map((file) => ({
            label: vscode.workspace.asRelativePath(file),
            uri: file,
          }));

          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a pipeline to run',
          });

          if (!selected) {
            return;
          }

          selectedFile = selected.uri;
        }

        // Ask for parameters
        const parametersInput = await vscode.window.showInputBox({
          prompt: 'Enter parameters (JSON format, or leave empty)',
          placeHolder: '{"env": "staging", "debug": true}',
        });

        let parameters = {};
        if (parametersInput) {
          try {
            parameters = JSON.parse(parametersInput);
          } catch (error) {
            vscode.window.showErrorMessage(`Invalid JSON parameters: ${error}`);
            return;
          }
        }

        vscode.window.showInformationMessage('Starting pipeline execution...');

        const runId = await api.runPipeline(selectedFile.fsPath, parameters);

        vscode.window
          .showInformationMessage(`Pipeline started: ${runId}`, 'Show Logs')
          .then((selection) => {
            if (selection === 'Show Logs') {
              vscode.commands.executeCommand('maestro.showLogs', runId);
            }
          });

        provider.refresh();
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to run pipeline: ${error}`);
      }
    },
  );

  const showStatusCommand = vscode.commands.registerCommand(
    'maestro.showStatus',
    async (item: MaestroRunItem) => {
      try {
        const run = await api.getRun(item.runId);
        const steps = await api.getRunSteps(item.runId);

        const panel = vscode.window.createWebviewPanel(
          'maestroStatus',
          `Maestro Run: ${run.workflow_name}`,
          vscode.ViewColumn.One,
          { enableScripts: true },
        );

        panel.webview.html = generateStatusHTML(run, steps);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to show status: ${error}`);
      }
    },
  );

  const showLogsCommand = vscode.commands.registerCommand(
    'maestro.showLogs',
    async (runIdOrItem: string | MaestroRunItem) => {
      const runId =
        typeof runIdOrItem === 'string' ? runIdOrItem : runIdOrItem.runId;

      try {
        const run = await api.getRun(runId);
        const logChannel = new MaestroLogOutputChannel(
          `Maestro: ${run.workflow_name}`,
        );

        logChannel.show();
        logChannel.clear();
        logChannel.appendLine(`=== Maestro Run: ${run.workflow_name} ===`);
        logChannel.appendLine(`Run ID: ${runId}`);
        logChannel.appendLine(`Status: ${run.status}`);
        logChannel.appendLine(`Environment: ${run.environment}`);
        logChannel.appendLine('');

        // Connect to WebSocket for live logs
        const ws = api.createWebSocket(runId);

        ws.on('open', () => {
          logChannel.appendLine('📡 Connected to live log stream\n');
        });

        ws.on('message', (data: Buffer) => {
          try {
            const event = JSON.parse(data.toString());
            const timestamp = new Date().toLocaleTimeString();

            switch (event.type) {
              case 'step:started':
                logChannel.appendLine(
                  `[${timestamp}] ⏳ Step started: ${event.step_id}`,
                );
                break;
              case 'step:completed':
                logChannel.appendLine(
                  `[${timestamp}] ✅ Step completed: ${event.step_id}`,
                );
                break;
              case 'step:failed':
                logChannel.appendLine(
                  `[${timestamp}] ❌ Step failed: ${event.step_id} - ${event.error}`,
                );
                break;
              case 'run:completed':
                logChannel.appendLine(`[${timestamp}] 🎉 Run completed`);
                ws.close();
                break;
              case 'run:failed':
                logChannel.appendLine(
                  `[${timestamp}] 💥 Run failed: ${event.error}`,
                );
                ws.close();
                break;
              default:
                if (event.message) {
                  logChannel.appendLine(`[${timestamp}] ${event.message}`);
                }
            }
          } catch (error) {
            logChannel.appendLine(`Error parsing log event: ${error}`);
          }
        });

        ws.on('error', (error) => {
          logChannel.appendLine(`❌ WebSocket error: ${error.message}`);
        });

        ws.on('close', () => {
          logChannel.appendLine('\n📡 Log stream disconnected');
        });

        // Clean up WebSocket on output channel disposal
        const originalDispose = logChannel.dispose.bind(logChannel);
        logChannel.dispose = () => {
          ws.close();
          originalDispose();
        };
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to show logs: ${error}`);
      }
    },
  );

  const cancelRunCommand = vscode.commands.registerCommand(
    'maestro.cancelRun',
    async (item: MaestroRunItem) => {
      try {
        const confirm = await vscode.window.showWarningMessage(
          `Cancel run ${item.runId}?`,
          { modal: true },
          'Yes',
          'No',
        );

        if (confirm === 'Yes') {
          await api.cancelRun(item.runId);
          vscode.window.showInformationMessage('Run cancelled');
          provider.refresh();
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to cancel run: ${error}`);
      }
    },
  );

  const validateTemplateCommand = vscode.commands.registerCommand(
    'maestro.validateTemplate',
    async () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
      }

      if (!editor.document.fileName.includes('maestro')) {
        vscode.window.showErrorMessage('Active file is not a Maestro template');
        return;
      }

      try {
        const content = editor.document.getText();
        const workflow = yaml.load(content);

        // Basic validation
        if (!workflow || typeof workflow !== 'object') {
          throw new Error('Invalid YAML format');
        }

        const w = workflow as any;
        if (!w.name) {
          throw new Error('Missing workflow name');
        }

        if (!w.version) {
          throw new Error('Missing workflow version');
        }

        if (!w.stages || !Array.isArray(w.stages)) {
          throw new Error('Missing or invalid stages array');
        }

        vscode.window.showInformationMessage('✅ Template is valid');
      } catch (error) {
        vscode.window.showErrorMessage(
          `❌ Template validation failed: ${error}`,
        );
      }
    },
  );

  const refreshRunsListCommand = vscode.commands.registerCommand(
    'maestro.refreshRunsList',
    () => {
      provider.refresh();
    },
  );

  // Register all commands
  context.subscriptions.push(
    treeView,
    runPipelineCommand,
    showStatusCommand,
    showLogsCommand,
    cancelRunCommand,
    validateTemplateCommand,
    refreshRunsListCommand,
  );

  // Status bar item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = '$(terminal) Maestro';
  statusBarItem.tooltip = 'Maestro Orchestration';
  statusBarItem.command = 'maestro.runPipeline';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

export function deactivate() {
  // Clean up resources
}

function generateStatusHTML(run: MaestroRun, steps: MaestroStep[]): string {
  const statusColor = {
    running: '#007acc',
    completed: '#28a745',
    succeeded: '#28a745',
    failed: '#dc3545',
    cancelled: '#ffc107',
    pending: '#6c757d',
  };

  const stepsHTML = steps
    .map(
      (step) => `
    <tr>
      <td>${step.name}</td>
      <td><span style="color: ${statusColor[step.status as keyof typeof statusColor] || '#6c757d'}">${step.status}</span></td>
      <td>${step.duration_ms ? `${step.duration_ms}ms` : '-'}</td>
      <td>${step.cost_usd ? `$${step.cost_usd.toFixed(4)}` : '-'}</td>
      <td>${step.error || '-'}</td>
    </tr>
  `,
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: sans-serif; margin: 20px; }
        .header { border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
        .status { font-weight: bold; color: ${statusColor[run.status as keyof typeof statusColor] || '#6c757d'}; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${run.workflow_name}</h1>
        <p><strong>Run ID:</strong> ${run.run_id}</p>
        <p><strong>Status:</strong> <span class="status">${run.status}</span></p>
        <p><strong>Environment:</strong> ${run.environment}</p>
        <p><strong>Cost:</strong> $${run.cost_usd || 0}</p>
        <p><strong>Started:</strong> ${new Date(run.created_at).toLocaleString()}</p>
        ${run.completed_at ? `<p><strong>Completed:</strong> ${new Date(run.completed_at).toLocaleString()}</p>` : ''}
      </div>
      
      <h2>Steps</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Cost</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          ${stepsHTML}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

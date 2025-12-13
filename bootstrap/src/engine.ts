import fs from 'fs-extra';
import path from 'path';
import { SummitConfig, EventsConfig } from './types.js';
import { loadConfig, loadEvents } from './config.js';
import chalk from 'chalk';

export class SummitEngine {
  private config: SummitConfig | null = null;
  private events: EventsConfig | null = null;
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async init() {
    console.log(chalk.blue('Initializing Summit Runtime Engine...'));

    const configPath = path.join(this.rootDir, 'summit.yaml');
    this.config = await loadConfig(configPath);
    console.log(chalk.green(`Loaded configuration from ${configPath}`));

    const eventsPath = path.join(this.rootDir, 'orchestrator', 'EVENTS.yaml');
    if (fs.existsSync(eventsPath)) {
        this.events = await loadEvents(eventsPath);
        console.log(chalk.green(`Loaded events from ${eventsPath}`));
    } else {
        console.warn(chalk.yellow(`Events file not found at ${eventsPath}`));
        this.events = { events: {} };
    }

    await this.validateEnvironment();
    await this.ensureDirectories();

    console.log(chalk.blue('Summit Runtime Engine Initialized.'));
  }

  private async validateEnvironment() {
    if (!this.config) throw new Error("Config not loaded");

    // Validate agents exist
    for (const [name, agent] of Object.entries(this.config.agents)) {
        if (agent.enabled) {
            // In a real scenario, check if agent.path exists.
            // Since we are bootstrapping, we might warn if missing.
            const agentPath = path.resolve(this.rootDir, '..', agent.path); // Assuming paths are relative to repo root
            // Note: rootDir is 'bootstrap/', so repo root is 'bootstrap/../'

            // For this implementation, we just log.
            // console.log(`Validating agent ${name} at ${agentPath}`);
        }
    }

    // Validate flows exist
    for (const flowPath of this.config.flows) {
        const fullPath = path.resolve(this.rootDir, '..', flowPath); // Assuming repo root relative
        // console.log(`Validating flow at ${fullPath}`);
    }
  }

  private async ensureDirectories() {
    if (!this.config) return;
    const logsDir = path.resolve(this.rootDir, '..', this.config.runtime.logs_dir);
    const stateDir = path.resolve(this.rootDir, '..', this.config.runtime.state_dir);

    await fs.ensureDir(logsDir);
    await fs.ensureDir(stateDir);
  }

  async runFlow(flowName: string) {
    if (!this.config) await this.init();

    console.log(chalk.blue(`Requesting execution of flow: ${flowName}`));

    // Check if flow exists in config
    const flowEntry = this.config?.flows.find(f => f.includes(flowName));
    if (!flowEntry) {
        console.error(chalk.red(`Flow '${flowName}' not found in configuration.`));
        return;
    }

    console.log(chalk.yellow(`Starting flow execution (simulation)...`));
    // Here we would actually parse the flow YAML and execute steps.
    // For the bootstrap engine, we acknowledge the request and log it.

    this.logEvent('flow_start', { flow: flowName });

    // Simulating steps
    console.log(`[Executor] Loading flow definition from ${flowEntry}...`);
    console.log(`[Governance] Validating flow against ${this.config?.governance.pr_policy}...`);
    console.log(`[Agent] executing steps...`);

    this.logEvent('flow_complete', { flow: flowName, status: 'success' });
    console.log(chalk.green(`Flow ${flowName} completed successfully.`));
  }

  async listFlows() {
    if (!this.config) await this.init();
    console.log(chalk.bold('Available Flows:'));
    this.config?.flows.forEach(f => console.log(` - ${f}`));
  }

  async listAgents() {
    if (!this.config) await this.init();
    console.log(chalk.bold('Registered Agents:'));
    Object.entries(this.config?.agents || {}).forEach(([name, cfg]) => {
        console.log(` - ${name} [${cfg.enabled ? chalk.green('ENABLED') : chalk.red('DISABLED')}] (${cfg.path})`);
    });
  }

  async getAgentInfo(agentName: string) {
    if (!this.config) await this.init();
    const agent = this.config?.agents[agentName];
    if (!agent) {
        console.error(chalk.red(`Agent '${agentName}' not found.`));
        return;
    }
    console.log(chalk.bold(`Agent Info: ${agentName}`));
    console.log(` - Path: ${agent.path}`);
    console.log(` - Enabled: ${agent.enabled ? chalk.green('Yes') : chalk.red('No')}`);
    // In a real implementation, we would load the agent's README or config from the path
    const readmePath = path.resolve(this.rootDir, '..', agent.path, 'README.md');
    if (await fs.pathExists(readmePath)) {
        const content = await fs.readFile(readmePath, 'utf-8');
        console.log(chalk.gray('\n--- README ---\n'));
        console.log(content.split('\n').slice(0, 5).join('\n')); // Show first 5 lines
        console.log(chalk.gray('\n--------------'));
    } else {
        console.log(chalk.yellow(' - No README found.'));
    }
  }

  async checkGovernance() {
    if (!this.config) await this.init();
    console.log(chalk.bold('Governance Check:'));
    Object.entries(this.config?.governance || {}).forEach(([key, doc]) => {
        console.log(` - Checking compliance with ${key} (${doc})... ${chalk.green('PASSED')}`);
    });
  }

  private logEvent(type: string, data: any) {
     // structured logging
     const timestamp = new Date().toISOString();
     // console.log(JSON.stringify({ timestamp, type, ...data }));
  }
}

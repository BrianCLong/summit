"use strict";
/**
 * Maestro CLI Run Command
 * Executes workflows locally or remotely with real-time feedback
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunCommand = void 0;
const fs_1 = require("fs");
const chalk_1 = __importDefault(require("chalk"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const ws_1 = __importDefault(require("ws"));
const ora_1 = __importDefault(require("ora"));
const engine_1 = require("@intelgraph/maestro-core/engine");
const postgres_state_store_1 = require("@intelgraph/maestro-core/stores/postgres-state-store");
const s3_artifact_store_1 = require("@intelgraph/maestro-core/stores/s3-artifact-store");
const opa_policy_engine_1 = require("@intelgraph/maestro-core/policy/opa-policy-engine");
const litellm_plugin_1 = require("@intelgraph/maestro-core/plugins/litellm-plugin");
const ollama_plugin_1 = require("@intelgraph/maestro-core/plugins/ollama-plugin");
const web_scraper_plugin_1 = require("@intelgraph/maestro-core/plugins/web-scraper-plugin");
class RunCommand {
    spinner = (0, ora_1.default)();
    async execute(options) {
        try {
            // Validate workflow file exists
            if (!(0, fs_1.existsSync)(options.file)) {
                throw new Error(`Workflow file not found: ${options.file}`);
            }
            // Parse parameters
            const parameters = this.parseParameters(options.param || []);
            // Load and validate workflow
            const workflow = await this.loadWorkflow(options.file);
            // Determine execution mode
            if (options.local) {
                await this.runLocal(workflow, parameters, options);
            }
            else if (options.remote) {
                await this.runRemote(workflow, parameters, options);
            }
            else {
                // Auto-detect based on configuration
                await this.runAuto(workflow, parameters, options);
            }
            // Set up file watching if requested
            if (options.watch) {
                await this.setupWatch(options);
            }
        }
        catch (error) {
            console.error(chalk_1.default.red('✗'), 'Run failed:', error.message);
            process.exit(1);
        }
    }
    async loadWorkflow(filePath) {
        try {
            const content = (0, fs_1.readFileSync)(filePath, 'utf8');
            const workflow = js_yaml_1.default.load(content);
            // Basic validation
            if (!workflow.name || !workflow.version) {
                throw new Error('Workflow must have name and version');
            }
            if (!workflow.stages || !Array.isArray(workflow.stages)) {
                throw new Error('Workflow must have stages array');
            }
            return workflow;
        }
        catch (error) {
            throw new Error(`Failed to load workflow: ${error.message}`);
        }
    }
    parseParameters(params) {
        const result = {};
        for (const param of params) {
            const [key, ...valueParts] = param.split('=');
            if (!key || valueParts.length === 0) {
                throw new Error(`Invalid parameter format: ${param}. Use key=value`);
            }
            const value = valueParts.join('=');
            // Try to parse as JSON, fall back to string
            try {
                result[key] = JSON.parse(value);
            }
            catch {
                result[key] = value;
            }
        }
        return result;
    }
    async runLocal(workflow, parameters, options) {
        console.log(chalk_1.default.blue('🏃‍♂️'), 'Running workflow locally...\n');
        try {
            // Initialize local engine
            const engine = await this.initializeLocalEngine(options.env);
            // Convert workflow to Maestro format
            const maestroWorkflow = this.convertWorkflowFormat(workflow);
            // Create run context
            const runContext = {
                run_id: this.generateRunId(),
                workflow: maestroWorkflow,
                tenant_id: 'local',
                triggered_by: 'cli',
                environment: options.env,
                parameters,
                budget: {
                    max_cost_usd: 10.0,
                    max_duration_ms: 3600000, // 1 hour
                },
            };
            // Set up event listeners
            this.setupEngineListeners(engine);
            // Start execution
            const runId = await engine.startRun(runContext);
            // Wait for completion
            await this.waitForCompletion(engine, runId);
            console.log(chalk_1.default.green('\n✅'), 'Workflow completed successfully!');
        }
        catch (error) {
            throw new Error(`Local execution failed: ${error.message}`);
        }
    }
    async runRemote(workflow, parameters, options) {
        console.log(chalk_1.default.blue('☁️'), 'Running workflow remotely...\n');
        try {
            // Get cluster configuration
            const clusterConfig = await this.getClusterConfig(options.env);
            // Submit workflow
            const runId = await this.submitWorkflow(clusterConfig, workflow, parameters, options);
            // Stream execution status
            await this.streamRemoteExecution(clusterConfig, runId);
            console.log(chalk_1.default.green('\n✅'), 'Remote workflow completed!');
        }
        catch (error) {
            throw new Error(`Remote execution failed: ${error.message}`);
        }
    }
    async runAuto(workflow, parameters, options) {
        // Check if remote cluster is available
        const hasRemoteConfig = await this.hasRemoteConfiguration(options.env);
        if (hasRemoteConfig) {
            console.log(chalk_1.default.yellow('🤖'), 'Auto-detected remote configuration, running remotely');
            await this.runRemote(workflow, parameters, options);
        }
        else {
            console.log(chalk_1.default.yellow('🖥️'), 'No remote configuration found, running locally');
            await this.runLocal(workflow, parameters, options);
        }
    }
    async initializeLocalEngine(environment) {
        // Initialize stores
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.MAESTRO_DATABASE_URL ||
                'postgresql://postgres:password@localhost:5432/maestro',
        });
        const stateStore = new postgres_state_store_1.PostgresStateStore(pool);
        const artifactStore = new s3_artifact_store_1.S3ArtifactStore({
            bucket: process.env.MAESTRO_ARTIFACT_BUCKET || 'maestro-local-artifacts',
            endpoint: process.env.MAESTRO_S3_ENDPOINT || 'http://localhost:9000',
            accessKeyId: process.env.MAESTRO_ACCESS_KEY_ID || 'minioadmin',
            secretAccessKey: process.env.MAESTRO_SECRET_ACCESS_KEY || 'minioadmin',
        });
        const policyEngine = new opa_policy_engine_1.OPAPolicyEngine({
            opaUrl: process.env.MAESTRO_OPA_URL || 'http://localhost:8181',
            packageName: 'maestro',
        });
        // Create engine
        const engine = new engine_1.MaestroEngine(stateStore, artifactStore, policyEngine);
        // Register plugins
        engine.registerPlugin(new litellm_plugin_1.LiteLLMPlugin({
            baseUrl: process.env.LITELLM_BASE_URL || 'http://localhost:4000',
            apiKey: process.env.LITELLM_API_KEY || 'local-dev-key',
            costTrackingEnabled: true,
        }));
        engine.registerPlugin(new ollama_plugin_1.OllamaPlugin({
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            maxConcurrentRequests: parseInt(process.env.OLLAMA_MAX_CONCURRENT || '2'),
            autoModelSelection: true,
        }));
        engine.registerPlugin(new web_scraper_plugin_1.WebScraperPlugin({
            respectRobotsTxt: true,
            defaultDelay: 1000,
            maxConcurrentRequests: 3,
        }));
        return engine;
    }
    convertWorkflowFormat(workflow) {
        // Convert from user-friendly YAML format to internal Maestro format
        const steps = [];
        for (const stage of workflow.stages || []) {
            for (const step of stage.steps || []) {
                const maestroStep = {
                    id: `${stage.name}_${steps.length}`,
                    name: step.name || `Step ${steps.length + 1}`,
                    plugin: this.mapPluginName(step.run),
                    config: step.with || {},
                    depends_on: step.depends_on,
                    retry: step.retry,
                    timeout_ms: step.timeout_ms,
                    compensation: step.compensation,
                };
                steps.push(maestroStep);
            }
        }
        return {
            name: workflow.name,
            version: workflow.version,
            steps,
            global_timeout_ms: workflow.global_timeout_ms,
            on_failure: workflow.on_failure || 'stop',
        };
    }
    mapPluginName(runName) {
        const mapping = {
            'litellm.generate': 'litellm',
            litellm: 'litellm',
            ollama: 'ollama',
            web_scraper: 'web_scraper',
            scrape: 'web_scraper',
            shell: 'shell',
            docker: 'docker',
            'api.request': 'api',
        };
        return mapping[runName] || runName;
    }
    setupEngineListeners(engine) {
        engine.on('run:started', (event) => {
            console.log(chalk_1.default.blue('▶️'), `Run started: ${event.run_id}`);
        });
        engine.on('step:completed', (event) => {
            console.log(chalk_1.default.green('✅'), `Step completed: ${event.step_id}`);
        });
        engine.on('step:failed', (event) => {
            console.log(chalk_1.default.red('❌'), `Step failed: ${event.step_id} - ${event.error}`);
        });
        engine.on('run:completed', (event) => {
            console.log(chalk_1.default.green('🎉'), `Run completed: ${event.run_id}`);
        });
        engine.on('run:failed', (event) => {
            console.log(chalk_1.default.red('💥'), `Run failed: ${event.run_id} - ${event.error}`);
        });
    }
    async waitForCompletion(engine, runId) {
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(async () => {
                try {
                    const status = await engine.getRunStatus(runId);
                    if (status.status === 'completed') {
                        clearInterval(checkInterval);
                        resolve();
                    }
                    else if (status.status === 'failed' ||
                        status.status === 'cancelled') {
                        clearInterval(checkInterval);
                        reject(new Error(`Workflow ${status.status}: ${status.error || 'Unknown error'}`));
                    }
                }
                catch (error) {
                    clearInterval(checkInterval);
                    reject(error);
                }
            }, 1000);
            // Set timeout
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Workflow execution timeout'));
            }, 3600000); // 1 hour timeout
        });
    }
    async getClusterConfig(environment) {
        // Load cluster configuration from config files or environment
        const config = {
            apiUrl: process.env.MAESTRO_API_URL || 'https://maestro-api.example.com',
            apiKey: process.env.MAESTRO_API_KEY,
            namespace: process.env.MAESTRO_NAMESPACE || 'default',
            environment,
        };
        if (!config.apiKey) {
            throw new Error('MAESTRO_API_KEY environment variable is required for remote execution');
        }
        return config;
    }
    async submitWorkflow(clusterConfig, workflow, parameters, options) {
        // Submit workflow to remote cluster via API
        const axios = require('axios');
        const response = await axios.post(`${clusterConfig.apiUrl}/api/v1/workflows/runs`, {
            workflow,
            parameters,
            environment: clusterConfig.environment,
            triggered_by: 'cli',
        }, {
            headers: {
                Authorization: `Bearer ${clusterConfig.apiKey}`,
                'Content-Type': 'application/json',
            },
        });
        return response.data.run_id;
    }
    async streamRemoteExecution(clusterConfig, runId) {
        // Connect to WebSocket for real-time updates
        const wsUrl = clusterConfig.apiUrl.replace(/^http/, 'ws') +
            `/api/v1/workflows/runs/${runId}/stream`;
        return new Promise((resolve, reject) => {
            const ws = new ws_1.default(wsUrl, {
                headers: {
                    Authorization: `Bearer ${clusterConfig.apiKey}`,
                },
            });
            ws.on('open', () => {
                console.log(chalk_1.default.blue('📡'), 'Connected to remote execution stream');
            });
            ws.on('message', (data) => {
                const event = JSON.parse(data.toString());
                this.handleRemoteEvent(event);
                if (event.type === 'run:completed') {
                    ws.close();
                    resolve();
                }
                else if (event.type === 'run:failed') {
                    ws.close();
                    reject(new Error(event.error));
                }
            });
            ws.on('error', (error) => {
                reject(error);
            });
            ws.on('close', () => {
                console.log(chalk_1.default.gray('📡'), 'Disconnected from remote stream');
            });
        });
    }
    handleRemoteEvent(event) {
        switch (event.type) {
            case 'run:started':
                console.log(chalk_1.default.blue('▶️'), `Remote run started: ${event.run_id}`);
                break;
            case 'step:started':
                console.log(chalk_1.default.yellow('⏳'), `Step started: ${event.step_id}`);
                break;
            case 'step:completed':
                console.log(chalk_1.default.green('✅'), `Step completed: ${event.step_id}`);
                break;
            case 'step:failed':
                console.log(chalk_1.default.red('❌'), `Step failed: ${event.step_id} - ${event.error}`);
                break;
            case 'run:progress':
                const progress = Math.round((event.completed_steps / event.total_steps) * 100);
                console.log(chalk_1.default.blue('📊'), `Progress: ${progress}% (${event.completed_steps}/${event.total_steps})`);
                break;
        }
    }
    async hasRemoteConfiguration(environment) {
        return !!(process.env.MAESTRO_API_URL && process.env.MAESTRO_API_KEY);
    }
    async setupWatch(options) {
        console.log(chalk_1.default.yellow('\n👀'), 'Watching for file changes...');
        console.log(chalk_1.default.gray('Press Ctrl+C to stop\n'));
        (0, fs_1.watchFile)(options.file, { interval: 1000 }, async () => {
            console.log(chalk_1.default.blue('\n🔄'), 'File changed, re-running workflow...\n');
            try {
                // Re-run with same options but without watch
                const newOptions = { ...options, watch: false };
                await this.execute(newOptions);
            }
            catch (error) {
                console.error(chalk_1.default.red('✗'), 'Re-run failed:', error.message);
            }
        });
        // Keep process alive
        return new Promise(() => {
            // This promise never resolves, keeping the process alive for file watching
        });
    }
    generateRunId() {
        return `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }
}
exports.RunCommand = RunCommand;

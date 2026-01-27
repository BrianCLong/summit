
import { MaestroTask } from './model';
import { MaestroEngine } from './engine';
import { MaestroAgentService } from './agent_service';
import { logger } from '../utils/logger';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const SANDBOX_ROOT = path.join(os.tmpdir(), 'maestro_sandbox');

// Mock Interfaces for Integrations
interface LLMService {
  callCompletion(runId: string, taskId: string, payload: any): Promise<any>;
}
interface GraphService {
  executeAlgorithm(name: string, params: any): Promise<any>;
}

export class MaestroHandlers {
  constructor(
    private engine: MaestroEngine,
    private agentService: MaestroAgentService,
    private llm: LLMService,
    private graph: GraphService
  ) {
    // Ensure sandbox root exists
    fs.mkdir(SANDBOX_ROOT, { recursive: true }).catch(err =>
      logger.error('Failed to create sandbox root', err)
    );
  }

  registerAll() {
    this.engine.registerTaskHandler('llm_call', this.handleLLMCall.bind(this));
    this.engine.registerTaskHandler('rag_query', this.handleRAGQuery.bind(this));
    this.engine.registerTaskHandler('graph_job', this.handleGraphJob.bind(this));
    this.engine.registerTaskHandler('agent_call', this.handleAgentCall.bind(this));
    this.engine.registerTaskHandler('custom', this.handleCustom.bind(this));
    this.engine.registerTaskHandler('sandbox_exec', this.handleSandboxExec.bind(this));
  }

  private async handleLLMCall(task: MaestroTask): Promise<any> {
    logger.info(`[Maestro] Executing LLM Call for task ${task.id}`);
    const { model, prompt, system } = task.payload as any;
    // Call the LLM service
    // In a real implementation we would construct the message payload from task inputs
    return this.llm.callCompletion(task.runId, task.id, {
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: system || 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ]
    });
  }

  private async handleRAGQuery(task: MaestroTask): Promise<any> {
    logger.info(`[Maestro] Executing RAG Query for task ${task.id}`);
    const { query, filters } = task.payload as any;
    // Stub RAG logic
    return {
      query,
      results: [
        { id: 'doc-1', text: 'This is a retrieved document.', score: 0.95 },
        { id: 'doc-2', text: 'Another relevant chunk.', score: 0.88 }
      ]
    };
  }

  private async handleGraphJob(task: MaestroTask): Promise<any> {
    logger.info(`[Maestro] Executing Graph Job for task ${task.id}`);
    const { algorithm, params } = task.payload as any;
    return this.graph.executeAlgorithm(algorithm, params);
  }

  private async handleAgentCall(task: MaestroTask): Promise<any> {
    logger.info(`[Maestro] Executing Agent Call for task ${task.id}`);
    const { agentId, input } = task.payload as any;

    // 1. Resolve Agent
    const agent = await this.agentService.getAgent(agentId, task.tenantId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    // 2. Trigger Sub-Run
    // Note: In a real distributed system, we might need to handle the sub-run async
    // (i.e., this task waits for the sub-run to complete via polling or events).
    // For simplicity here, we assume we just start it and maybe return the Run ID.
    // If we want to wait, we'd need a "suspend" mechanism which is complex.
    // Alternatively, we can "poll" internally if we are in a worker.

    // For v1 MVP: We launch the run and return the Run ID. The task is "succeeded"
    // as soon as the run is launched. This is "fire and forget".
    //
    // BETTER: Use a 'subflow' pattern where the engine knows to wait.
    // But since we are inside a handler, let's just launch it.
    // If the requirement is to wait for the output, we'd need a suspendable task.
    //
    // Let's implement a "Launch Only" behavior for now, or a simple busy-wait loop
    // if the run is expected to be fast (bad for scalability but ok for MVP).

    const subRun = await this.engine.createRun(
      task.tenantId,
      agent.templateId,
      input || {},
      'system-agent-caller'
    );

    return { subRunId: subRun.id, status: 'started' };
  }

  private async handleCustom(task: MaestroTask): Promise<any> {
    logger.info(`[Maestro] Executing Custom task ${task.id}`);
    return { result: 'custom execution done', payload: task.payload };
  }

  private async handleSandboxExec(task: MaestroTask): Promise<any> {
    logger.info(`[Maestro] Executing Sandbox Task ${task.id}`);
    const { operation, cmd, path: filePath, content, url, pkg } = task.payload as any;
    const runId = task.runId;
    const sandboxDir = path.join(SANDBOX_ROOT, runId);

    // Ensure run directory exists
    await fs.mkdir(sandboxDir, { recursive: true });

    // Helper to validate path
    const validatePath = (p: string) => {
      const resolved = path.resolve(sandboxDir, p);
      if (!resolved.startsWith(sandboxDir + path.sep) && resolved !== sandboxDir) {
        throw new Error(`Path traversal attempt detected: ${p}`);
      }
      return resolved;
    };

    // Helper for SSRF
    const isPrivateIP = (hostname: string) => {
      // Simple regex for IPs. Real implementation should dns resolve first to be safe, but for MVP:
      // Block localhost
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
      // Block private ranges (basic string check for MVP)
      if (hostname.startsWith('10.') || hostname.startsWith('192.168.')) return true;
      if (hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) return true;
      return false;
    };

    // Helper for Pkg Validation
    const isValidPkg = (name: string) => {
      return /^([@a-zA-Z0-9/._-]+)$/.test(name);
    };

    try {
      switch (operation) {
        case 'run': {
          if (!cmd) throw new Error('Missing cmd for run operation');
          logger.warn(`[Maestro] Executing HOST command: ${cmd} (Sandbox is NOT containerized)`);
          const { stdout, stderr } = await execAsync(cmd, {
            cwd: sandboxDir,
            timeout: 30000,
            maxBuffer: 1024 * 1024
          });
          return { stdout, stderr };
        }
        case 'read': {
          if (!filePath) throw new Error('Missing path for read operation');
          const p = validatePath(filePath);
          const data = await fs.readFile(p, 'utf-8');
          return { content: data };
        }
        case 'write': {
          if (!filePath) throw new Error('Missing path for write operation');
          const p = validatePath(filePath);
          await fs.writeFile(p, content || '');
          return { status: 'success', path: filePath };
        }
        case 'list': {
          const p = filePath ? validatePath(filePath) : sandboxDir;
          const files = await fs.readdir(p);
          return { files };
        }
        case 'install': {
          if (!pkg) throw new Error('Missing pkg for install operation');
          if (!isValidPkg(pkg)) throw new Error(`Invalid package name: ${pkg}`);

          // Ensure package.json exists
          try {
            await fs.access(path.join(sandboxDir, 'package.json'));
          } catch {
            await execAsync('npm init -y', { cwd: sandboxDir });
          }
          const { stdout, stderr } = await execAsync(`npm install ${pkg}`, {
            cwd: sandboxDir,
            timeout: 60000
          });
          return { stdout, stderr };
        }
        case 'fetch': {
          if (!url) throw new Error('Missing url for fetch operation');
          const u = new URL(url);
          if (isPrivateIP(u.hostname)) {
            throw new Error(`SSRF Blocked: ${u.hostname} is a private address`);
          }

          // Global fetch is available in Node 18+
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
          const text = await response.text();
          return { content: text };
        }
        default:
          throw new Error(`Unknown sandbox operation: ${operation}`);
      }
    } catch (error: any) {
      logger.error(`[Maestro] Sandbox execution failed`, { error: error.message, task: task.id });
      throw error;
    }
  }
}

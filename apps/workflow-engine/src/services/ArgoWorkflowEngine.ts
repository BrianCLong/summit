import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import https from 'https';
import { logger } from '../utils/logger';
import { config } from '../config';
import type { WorkflowDefinition, WorkflowExecution, WorkflowStep } from './WorkflowService';
import type { MaestroPersonaProfile } from './maestroPersona';

export interface ArgoWorkflowOptions {
  enabled: boolean;
  baseUrl: string;
  namespace: string;
  serviceAccountTokenPath?: string;
  workflowTemplateRef?: string;
  parallelism: number;
  workflowExecutionTimeoutSeconds: number;
  submitQueue?: string;
  tlsVerify: boolean;
}

export interface ArgoWorkflowStatus {
  phase?: string;
  startedAt?: string;
  finishedAt?: string;
  progress?: string;
  nodes?: Record<string, any>;
}

export interface ArgoSubmissionResult {
  name: string;
  namespace: string;
  manifest: Record<string, any>;
  raw?: any;
}

export interface RetryOptions {
  nodeId?: string;
  restartSuccessful?: boolean;
}

export class ArgoWorkflowEngine {
  private client?: AxiosInstance;
  private readonly options: ArgoWorkflowOptions;

  constructor(options?: Partial<ArgoWorkflowOptions>) {
    this.options = {
      enabled: config.argo.enabled,
      baseUrl: config.argo.baseUrl,
      namespace: config.argo.namespace,
      serviceAccountTokenPath: config.argo.serviceAccountTokenPath,
      workflowTemplateRef: config.argo.workflowTemplateRef,
      parallelism: config.argo.parallelism,
      workflowExecutionTimeoutSeconds: config.argo.workflowExecutionTimeoutSeconds,
      submitQueue: config.argo.submitQueue,
      tlsVerify: config.argo.tlsVerify,
      ...options,
    };

    if (!this.options.enabled) {
      logger.warn('Argo Workflow integration disabled. Workflow executions will run locally.');
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.resolveToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    this.client = axios.create({
      baseURL: this.options.baseUrl,
      headers,
      httpsAgent: this.options.tlsVerify
        ? undefined
        : new https.Agent({
            rejectUnauthorized: false,
          }),
    });
  }

  isEnabled(): boolean {
    return !!this.client;
  }

  async submitWorkflow(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    persona: MaestroPersonaProfile,
  ): Promise<ArgoSubmissionResult> {
    const manifest = this.buildWorkflowManifest(workflow, execution, persona);

    if (!this.client) {
      logger.info('Skipping Argo submission (client disabled). Returning manifest only.');
      return {
        name: `${manifest.metadata?.generateName || execution.id}-dry-run`,
        namespace: this.options.namespace,
        manifest,
      };
    }

    const { data } = await this.client.post(
      `/api/v1/workflows/${this.options.namespace}`,
      manifest,
    );

    const name = data?.metadata?.name || data?.metadata?.generateName || execution.id;

    logger.info('Submitted workflow execution to Argo', {
      workflowId: workflow.id,
      executionId: execution.id,
      argoWorkflow: name,
    });

    return {
      name,
      namespace: data?.metadata?.namespace || this.options.namespace,
      manifest,
      raw: data,
    };
  }

  async getWorkflowStatus(name: string): Promise<ArgoWorkflowStatus | null> {
    if (!this.client) {
      return null;
    }

    const { data } = await this.client.get(
      `/api/v1/workflows/${this.options.namespace}/${name}`,
    );

    return data?.status ?? null;
  }

  async retryWorkflow(name: string, options?: RetryOptions): Promise<void> {
    if (!this.client) {
      logger.warn('Retry requested but Argo client is disabled.');
      return;
    }

    await this.client.post(
      `/api/v1/workflows/${this.options.namespace}/${name}/retry`,
      {
        restartSuccessful: options?.restartSuccessful ?? false,
        nodeFieldSelector: options?.nodeId ? `id=${options.nodeId}` : undefined,
      },
    );
  }

  async terminateWorkflow(name: string): Promise<void> {
    if (!this.client) {
      logger.warn('Terminate requested but Argo client is disabled.');
      return;
    }

    await this.client.put(
      `/api/v1/workflows/${this.options.namespace}/${name}/terminate`,
      {},
    );
  }

  buildWorkflowManifest(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
    persona: MaestroPersonaProfile,
  ): Record<string, any> {
    const normalizedName = this.normalizeName(workflow.name || workflow.id);

    const tasks = workflow.steps.map((step) =>
      this.buildDagTask(step, workflow.steps, persona, execution),
    );

    const templates = workflow.steps.map((step) => this.buildTemplate(step, persona));

    const metadataLabels = {
      ...persona.labels,
      'maestro.execution/id': execution.id,
      'maestro.workflow/id': workflow.id,
      'maestro.workflow/version': workflow.version,
    };

    const metadataAnnotations = {
      ...persona.annotations,
      'maestro.execution/trigger': execution.triggerType,
    };

    return {
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'Workflow',
      metadata: {
        generateName: `${normalizedName}-`,
        namespace: this.options.namespace,
        labels: metadataLabels,
        annotations: metadataAnnotations,
      },
      spec: {
        entrypoint: 'maestro-dag',
        parallelism: this.options.parallelism,
        podGC: {
          strategy: 'OnWorkflowCompletion',
        },
        workflowTemplateRef: this.options.workflowTemplateRef
          ? { name: this.options.workflowTemplateRef }
          : undefined,
        ttlStrategy: {
          secondsAfterCompletion: 3600,
        },
        synchronization: this.options.submitQueue
          ? {
              semaphore: {
                configMapKeyRef: {
                  name: this.options.submitQueue,
                  key: 'maxParallelism',
                },
              },
            }
          : undefined,
        templates: [
          {
            name: 'maestro-dag',
            dag: {
              tasks,
            },
          },
          ...templates,
        ],
      },
    };
  }

  private buildDagTask(
    step: WorkflowStep,
    steps: WorkflowStep[],
    persona: MaestroPersonaProfile,
    execution: WorkflowExecution,
  ): Record<string, any> {
    const dependencies = this.resolveDependencies(step.id, steps).map((depId) =>
      this.normalizeName(depId),
    );

    const taskName = this.normalizeName(step.id);
    const retryStrategy = this.buildRetryStrategy(step);

    const task: Record<string, any> = {
      name: taskName,
      template: `step-${step.id}`,
      arguments: {
        parameters: Object.entries(step.config.inputMappings || {}).map(([key, contextKey]) => ({
          name: key,
          value: `{{workflow.parameters.${this.normalizeParameter(contextKey)}}}`,
        })),
      },
      metadata: {
        labels: {
          ...(persona.labels || {}),
          'maestro.step/id': step.id,
          'maestro.step/name': step.name,
        },
      },
      retryStrategy,
    };

    if (dependencies.length > 0) {
      task.dependencies = dependencies;
    }

    if (step.type === 'parallel') {
      task.parallelism = step.config.maxIterations || execution.context?.parallelism || 4;
    }

    if (step.retryConfig?.exponentialBackoff) {
      task.retryStrategy.backoff = {
        duration: `${step.retryConfig.retryDelay}ms`,
        factor: 2,
        maxDuration: `${Math.max(step.retryConfig.retryDelay * 8, 60000)}ms`,
      };
    }

    return task;
  }

  private buildTemplate(step: WorkflowStep, persona: MaestroPersonaProfile): Record<string, any> {
    const image = step.config.actionConfig?.image || persona.defaultImage;

    const command = step.config.actionConfig?.command || ['/bin/sh', '-c'];
    const args =
      step.config.actionConfig?.args || [
        `echo "[Maestro] Executing step ${step.name} (${step.id})"; ` +
          'echo "Input parameters: {{inputs.parameters}}"',
      ];

    const env = step.config.actionConfig?.env
      ? Object.entries(step.config.actionConfig.env).map(([name, value]) => ({ name, value }))
      : undefined;

    return {
      name: `step-${step.id}`,
      inputs: {
        parameters: Object.keys(step.config.inputMappings || {}).map((key) => ({ name: key })),
      },
      metadata: {
        labels: {
          ...(persona.labels || {}),
          'maestro.step/id': step.id,
          'maestro.step/type': step.type,
        },
        annotations: persona.annotations,
      },
      container: {
        image,
        command,
        args,
        env,
        resources: step.config.actionConfig?.resources,
      },
      retryStrategy: this.buildRetryStrategy(step),
    };
  }

  private buildRetryStrategy(step: WorkflowStep) {
    const maxRetries = step.retryConfig?.maxRetries ?? config.workflow.maxRetryAttempts;
    const retryDelay = step.retryConfig?.retryDelay ?? config.workflow.retryDelayMs;

    return {
      limit: maxRetries,
      retryPolicy: 'Always',
      backoff: {
        duration: `${retryDelay}ms`,
        factor: step.retryConfig?.exponentialBackoff ? 2 : 1,
        maxDuration: `${retryDelay * 10}ms`,
      },
    };
  }

  private resolveDependencies(stepId: string, steps: WorkflowStep[]): string[] {
    const dependencies = new Set<string>();

    for (const step of steps) {
      for (const connection of step.connections || []) {
        if (connection.targetStepId === stepId && connection.condition !== 'failure') {
          dependencies.add(step.id);
        }
      }
    }

    return Array.from(dependencies);
  }

  private normalizeName(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 63);
  }

  private normalizeParameter(value: string): string {
    return value
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '') || 'value';
  }

  private resolveToken(): string | undefined {
    if (process.env.ARGO_AUTH_TOKEN) {
      return process.env.ARGO_AUTH_TOKEN;
    }

    if (!this.options.serviceAccountTokenPath) {
      return undefined;
    }

    try {
      if (fs.existsSync(this.options.serviceAccountTokenPath)) {
        const content = fs.readFileSync(this.options.serviceAccountTokenPath, 'utf8');
        return content.trim();
      }
    } catch (error) {
      logger.warn('Unable to read Argo service account token', error);
    }

    return undefined;
  }
}

import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface PhantomConfig {
  baseUrl: string;
  token: string;
  validateSSL: boolean;
  timeout: number;
  retryAttempts: number;
  rateLimitRpm: number;
  defaultSeverity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PhantomContainer {
  id: number;
  name: string;
  description: string;
  label: string;
  status: 'new' | 'open' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sensitivity: 'amber' | 'green' | 'red' | 'white';
  owner_id: number;
  tenant_id: number;
  start_time: string;
  end_time?: string;
  due_time?: string;
  close_time?: string;
  container_type: string;
  artifact_count: number;
  playbook_runs: number;
  custom_fields?: Record<string, any>;
}

export interface PhantomArtifact {
  id?: number;
  container_id: number;
  source_data_identifier: string;
  name: string;
  label: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cef: Record<string, any>;
  cef_types?: Record<string, string[]>;
  raw_data?: string;
  run_automation?: boolean;
  tags?: string[];
  custom_fields?: Record<string, any>;
}

export interface PhantomPlaybook {
  id: number;
  name: string;
  description: string;
  category: string;
  status: 'active' | 'inactive' | 'draft';
  version: string;
  tags: string[];
  input_spec?: Record<string, any>;
  output_spec?: Record<string, any>;
}

export interface PhantomAction {
  id: number;
  name: string;
  action: string;
  app: string;
  parameters: Record<string, any>;
  status: 'success' | 'failed' | 'running' | 'waiting';
  message: string;
  result_data: any[];
  summary: Record<string, any>;
  playbook_run_id: number;
  container_id: number;
  start_time: string;
  end_time?: string;
}

export interface PhantomIncident {
  containerId: number;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  artifacts: Omit<PhantomArtifact, 'id' | 'container_id'>[];
  tags: string[];
  customFields?: Record<string, any>;
  source: string;
  sourceId: string;
}

export interface PlaybookExecution {
  id: string;
  playbookId: number;
  containerId: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  actions: PhantomAction[];
  error?: string;
}

export interface PhantomMetrics {
  totalContainers: number;
  openContainers: number;
  closedContainers: number;
  totalArtifacts: number;
  playbookRuns: number;
  successfulActions: number;
  failedActions: number;
  averageResolutionTime: number;
  apiCalls: number;
  errorRate: number;
}

export class PhantomConnector extends EventEmitter {
  private config: PhantomConfig;
  private rateLimiter: Map<string, number> = new Map();
  private metrics: PhantomMetrics;
  private executions = new Map<string, PlaybookExecution>();

  constructor(config: PhantomConfig) {
    super();
    this.config = config;
    this.metrics = {
      totalContainers: 0,
      openContainers: 0,
      closedContainers: 0,
      totalArtifacts: 0,
      playbookRuns: 0,
      successfulActions: 0,
      failedActions: 0,
      averageResolutionTime: 0,
      apiCalls: 0,
      errorRate: 0,
    };
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
  ): Promise<any> {
    await this.checkRateLimit();

    const url = `${this.config.baseUrl}/rest${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    this.metrics.apiCalls++;

    if (!response.ok) {
      this.metrics.errorRate = this.metrics.errorRate + 1;
      throw new Error(
        `Phantom API error: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const requests = this.rateLimiter.get(minute.toString()) || 0;

    if (requests >= this.config.rateLimitRpm) {
      const waitTime = 60000 - (now % 60000);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.rateLimiter.set(minute.toString(), requests + 1);

    // Clean up old entries
    for (const [key] of this.rateLimiter) {
      if (parseInt(key) < minute - 1) {
        this.rateLimiter.delete(key);
      }
    }
  }

  async createContainer(
    containerData: Omit<
      PhantomContainer,
      'id' | 'artifact_count' | 'playbook_runs'
    >,
  ): Promise<PhantomContainer> {
    try {
      const response = await this.makeRequest(
        '/container',
        'POST',
        containerData,
      );

      const container: PhantomContainer = {
        id: response.id,
        artifact_count: 0,
        playbook_runs: 0,
        ...containerData,
      };

      this.metrics.totalContainers++;
      if (container.status === 'open') {
        this.metrics.openContainers++;
      }

      this.emit('container_created', {
        containerId: container.id,
        name: container.name,
        severity: container.severity,
        timestamp: new Date(),
      });

      return container;
    } catch (error) {
      this.emit('container_creation_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        containerData,
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async createIncident(incident: PhantomIncident): Promise<PhantomContainer> {
    const container = await this.createContainer({
      name: incident.title,
      description: incident.description,
      label: 'incident',
      status: 'new',
      severity: incident.severity,
      sensitivity: 'amber',
      owner_id: 1,
      tenant_id: 1,
      start_time: new Date().toISOString(),
      container_type: 'default',
      custom_fields: {
        source: incident.source,
        source_id: incident.sourceId,
        ...incident.customFields,
      },
    });

    // Add artifacts to the container
    for (const artifactData of incident.artifacts) {
      await this.addArtifact({
        ...artifactData,
        container_id: container.id,
      });
    }

    // Add tags
    if (incident.tags.length > 0) {
      await this.tagContainer(container.id, incident.tags);
    }

    this.emit('incident_created', {
      containerId: container.id,
      incidentId: incident.sourceId,
      artifactCount: incident.artifacts.length,
      timestamp: new Date(),
    });

    return container;
  }

  async addArtifact(
    artifact: Omit<PhantomArtifact, 'id'>,
  ): Promise<PhantomArtifact> {
    try {
      const response = await this.makeRequest('/artifact', 'POST', artifact);

      const createdArtifact: PhantomArtifact = {
        id: response.id,
        ...artifact,
      };

      this.metrics.totalArtifacts++;

      this.emit('artifact_created', {
        artifactId: createdArtifact.id,
        containerId: artifact.container_id,
        name: artifact.name,
        timestamp: new Date(),
      });

      return createdArtifact;
    } catch (error) {
      this.emit('artifact_creation_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        artifact,
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async getContainer(containerId: number): Promise<PhantomContainer> {
    const response = await this.makeRequest(`/container/${containerId}`);
    return response;
  }

  async updateContainer(
    containerId: number,
    updates: Partial<PhantomContainer>,
  ): Promise<PhantomContainer> {
    const response = await this.makeRequest(
      `/container/${containerId}`,
      'POST',
      updates,
    );

    if (updates.status) {
      if (updates.status === 'closed') {
        this.metrics.openContainers--;
        this.metrics.closedContainers++;
      } else if (updates.status === 'open') {
        this.metrics.openContainers++;
      }
    }

    this.emit('container_updated', {
      containerId,
      updates,
      timestamp: new Date(),
    });

    return response;
  }

  async closeContainer(
    containerId: number,
    reason?: string,
  ): Promise<PhantomContainer> {
    return await this.updateContainer(containerId, {
      status: 'closed',
      close_time: new Date().toISOString(),
      custom_fields: reason ? { close_reason: reason } : undefined,
    });
  }

  async tagContainer(containerId: number, tags: string[]): Promise<void> {
    await this.makeRequest(`/container/${containerId}/tags`, 'POST', { tags });

    this.emit('container_tagged', {
      containerId,
      tags,
      timestamp: new Date(),
    });
  }

  async listPlaybooks(category?: string): Promise<PhantomPlaybook[]> {
    const endpoint = category ? `/playbook?category=${category}` : '/playbook';
    const response = await this.makeRequest(endpoint);
    return response.data || [];
  }

  async runPlaybook(
    playbookId: number,
    containerId: number,
    inputs: Record<string, any> = {},
  ): Promise<PlaybookExecution> {
    try {
      const response = await this.makeRequest('/playbook_run', 'POST', {
        playbook_id: playbookId,
        container_id: containerId,
        scope: 'new',
        run_data: inputs,
      });

      const execution: PlaybookExecution = {
        id: crypto.randomUUID(),
        playbookId,
        containerId,
        status: 'queued',
        startTime: new Date(),
        inputs,
        actions: [],
      };

      this.executions.set(execution.id, execution);
      this.metrics.playbookRuns++;

      this.emit('playbook_started', {
        executionId: execution.id,
        playbookId,
        containerId,
        timestamp: execution.startTime,
      });

      // Monitor the playbook execution
      this.monitorPlaybookExecution(response.playbook_run_id, execution.id);

      return execution;
    } catch (error) {
      this.emit('playbook_failed', {
        playbookId,
        containerId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  private async monitorPlaybookExecution(
    runId: number,
    executionId: string,
  ): Promise<void> {
    const checkInterval = setInterval(async () => {
      try {
        const execution = this.executions.get(executionId);
        if (!execution) {
          clearInterval(checkInterval);
          return;
        }

        const response = await this.makeRequest(`/playbook_run/${runId}`);

        execution.status = this.mapPhantomStatus(response.status);

        if (response.status === 'success' || response.status === 'failed') {
          execution.endTime = new Date();
          execution.outputs = response.result_data;

          if (response.status === 'failed') {
            execution.error = response.message;
          }

          clearInterval(checkInterval);

          this.emit('playbook_completed', {
            executionId,
            status: execution.status,
            duration:
              execution.endTime.getTime() - execution.startTime.getTime(),
            timestamp: execution.endTime,
          });
        }

        // Get action results
        const actions = await this.getPlaybookActions(runId);
        execution.actions = actions;

        this.metrics.successfulActions += actions.filter(
          (a) => a.status === 'success',
        ).length;
        this.metrics.failedActions += actions.filter(
          (a) => a.status === 'failed',
        ).length;
      } catch (error) {
        this.emit('playbook_monitor_error', {
          executionId,
          runId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, 5000);
  }

  private mapPhantomStatus(phantomStatus: string): PlaybookExecution['status'] {
    switch (phantomStatus) {
      case 'running':
        return 'running';
      case 'success':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'queued';
    }
  }

  async getPlaybookActions(runId: number): Promise<PhantomAction[]> {
    const response = await this.makeRequest(
      `/action_run?playbook_run_id=${runId}`,
    );
    return response.data || [];
  }

  async executeAction(
    appName: string,
    actionName: string,
    parameters: Record<string, any>,
    containerId: number,
    assets?: string[],
  ): Promise<PhantomAction> {
    try {
      const response = await this.makeRequest('/action_run', 'POST', {
        action: actionName,
        app: appName,
        parameters,
        container_id: containerId,
        assets: assets || [],
      });

      const action: PhantomAction = {
        id: response.id,
        name: actionName,
        action: actionName,
        app: appName,
        parameters,
        status: 'running',
        message: '',
        result_data: [],
        summary: {},
        playbook_run_id: 0,
        container_id: containerId,
        start_time: new Date().toISOString(),
      };

      this.emit('action_executed', {
        actionId: action.id,
        actionName,
        appName,
        containerId,
        timestamp: new Date(),
      });

      return action;
    } catch (error) {
      this.emit('action_failed', {
        actionName,
        appName,
        containerId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  async searchContainers(query: {
    status?: string;
    severity?: string;
    label?: string;
    start_time?: string;
    end_time?: string;
    limit?: number;
    offset?: number;
  }): Promise<PhantomContainer[]> {
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await this.makeRequest(`/container?${params.toString()}`);
    return response.data || [];
  }

  async getArtifacts(containerId: number): Promise<PhantomArtifact[]> {
    const response = await this.makeRequest(
      `/artifact?container_id=${containerId}`,
    );
    return response.data || [];
  }

  async addComment(
    containerId: number,
    comment: string,
    author?: string,
  ): Promise<void> {
    await this.makeRequest('/note', 'POST', {
      container_id: containerId,
      title: 'Automated Comment',
      content: comment,
      note_type: 'general',
      author: author || 'IntelGraph',
    });

    this.emit('comment_added', {
      containerId,
      comment,
      author: author || 'IntelGraph',
      timestamp: new Date(),
    });
  }

  async addEvidence(
    containerId: number,
    evidence: {
      name: string;
      description: string;
      file_path?: string;
      vault_id?: string;
      url?: string;
    },
  ): Promise<void> {
    await this.makeRequest('/vault_info', 'POST', {
      container_id: containerId,
      name: evidence.name,
      metadata: {
        description: evidence.description,
        type: 'evidence',
      },
      file_path: evidence.file_path,
      vault_id: evidence.vault_id,
      url: evidence.url,
    });

    this.emit('evidence_added', {
      containerId,
      evidenceName: evidence.name,
      timestamp: new Date(),
    });
  }

  getExecution(executionId: string): PlaybookExecution | undefined {
    return this.executions.get(executionId);
  }

  listExecutions(): PlaybookExecution[] {
    return Array.from(this.executions.values());
  }

  getMetrics(): PhantomMetrics {
    return { ...this.metrics };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/system_info');

      this.emit('connection_tested', {
        success: true,
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      this.emit('connection_tested', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });

      return false;
    }
  }

  async getSystemInfo(): Promise<any> {
    return await this.makeRequest('/system_info');
  }
}

import fetch from 'node-fetch';

type Fetch = typeof fetch;

export interface PrerClientOptions {
  baseUrl: string;
  fetchImpl?: Fetch;
  defaultActor?: string;
}

export interface CreateExperimentInput {
  name: string;
  hypothesis: string;
  metrics: Array<{
    name: string;
    baselineRate: number;
    minDetectableEffect: number;
  }>;
  stopRule: {
    maxDurationDays: number;
    maxUnits?: number;
  };
  analysisPlan: {
    method: 'difference-in-proportions';
    alpha: number;
    desiredPower: number;
  };
  actor?: string;
}

export interface ResultIngestInput {
  metric: string;
  variant: string;
  value: number;
  actor?: string;
}

export class PrerClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: Fetch;
  private readonly defaultActor?: string;

  constructor(options: PrerClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.defaultActor = options.defaultActor;
  }

  async createExperiment(input: CreateExperimentInput) {
    const actor = input.actor ?? this.requireActor();
    const response = await this.fetchImpl(`${this.baseUrl}/experiments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, actor })
    });
    if (!response.ok) {
      throw new Error(`Failed to create experiment: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async startExperiment(id: string, actor?: string) {
    const resolvedActor = actor ?? this.requireActor();
    const response = await this.fetchImpl(`${this.baseUrl}/experiments/${id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: resolvedActor })
    });
    if (!response.ok) {
      throw new Error(`Failed to start experiment: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async ingestResult(id: string, input: ResultIngestInput) {
    const actor = input.actor ?? this.requireActor();
    const response = await this.fetchImpl(`${this.baseUrl}/experiments/${id}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, actor })
    });
    if (!response.ok) {
      throw new Error(`Failed to ingest result: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async exportPreregistration(id: string, actor?: string) {
    const resolvedActor = actor ?? this.requireActor();
    const response = await this.fetchImpl(`${this.baseUrl}/experiments/${id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: resolvedActor })
    });
    if (!response.ok) {
      throw new Error(`Failed to export preregistration: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  private requireActor(): string {
    if (!this.defaultActor) {
      throw new Error('Actor must be provided when no defaultActor is configured.');
    }
    return this.defaultActor;
  }
}

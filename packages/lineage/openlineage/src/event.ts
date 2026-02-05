import { z } from 'zod';
import { v7 as uuidv7, v4 as uuidv4 } from 'uuid';
import { SourceCodeJobFacet, DocumentationJobFacet, SqlJobFacet } from './facets/core.js';
import { TenantFacet, SecurityFacet, BuildFacet } from './facets/summit.js';

// Use v7 if available (node-uuid likely supports it in recent versions), fall back to v4
const generateUuid = () => {
  try {
    return uuidv7();
  } catch (e) {
    return uuidv4();
  }
};

export interface Job {
  namespace: string;
  name: string;
  facets?: {
    sourceCode?: SourceCodeJobFacet;
    documentation?: DocumentationJobFacet;
    sql?: SqlJobFacet;
    [key: string]: any;
  };
}

export interface Run {
  runId: string;
  facets?: {
    tenant?: TenantFacet;
    security?: SecurityFacet;
    build?: BuildFacet;
    [key: string]: any;
  };
}

export interface Dataset {
  namespace: string;
  name: string;
  facets?: Record<string, any>;
  inputFacets?: Record<string, any>;
  outputFacets?: Record<string, any>;
}

export type InputDataset = Dataset;
export type OutputDataset = Dataset;

export type EventType = 'START' | 'RUNNING' | 'COMPLETE' | 'ABORT' | 'FAIL' | 'OTHER';

export interface RunEvent {
  eventType: EventType;
  eventTime: string; // ISO 8601
  run: Run;
  job: Job;
  inputs?: InputDataset[];
  outputs?: OutputDataset[];
  producer: string;
  schemaURL: string;
}

export class OpenLineageClient {
  private producer: string;

  constructor(producer: string) {
    this.producer = producer;
  }

  createRunEvent(params: {
    eventType: EventType;
    job: Job;
    runId?: string;
    inputs?: InputDataset[];
    outputs?: OutputDataset[];
    runFacets?: Run['facets'];
    eventTime?: string;
  }): RunEvent {
    const { eventType, job, runId, inputs, outputs, runFacets, eventTime } = params;

    return {
      eventType,
      eventTime: eventTime || new Date().toISOString(),
      run: {
        runId: runId || generateUuid(),
        facets: runFacets,
      },
      job,
      inputs: inputs || [],
      outputs: outputs || [],
      producer: this.producer,
      schemaURL: 'https://openlineage.io/spec/1-0-5/OpenLineage.json',
    };
  }
}

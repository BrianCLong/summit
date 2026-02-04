import { z } from 'zod';
import { SourceCodeJobFacet, DocumentationJobFacet, SqlJobFacet } from './facets/core.js';
import { TenantFacet, SecurityFacet, BuildFacet } from './facets/summit.js';
import { generateRunId } from './runid.js';
import { SummitProvenanceFacet } from './facets/summit.js';

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

  createRunEventWithProvenance(params: {
    eventType: EventType;
    job: Job;
    runId: string;
    provenance: SummitProvenanceFacet;
    inputs?: InputDataset[];
    outputs?: OutputDataset[];
    runFacets?: Run['facets'];
    eventTime?: string;
  }): RunEvent {
    const { eventType, job, runId, provenance, inputs, outputs, runFacets, eventTime } = params;
    return this.createRunEvent({
      eventType,
      job,
      runId,
      inputs,
      outputs,
      runFacets: {
        ...runFacets,
        summit_provenance: provenance,
      },
      eventTime,
    });
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
        runId: runId || generateRunId(),
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

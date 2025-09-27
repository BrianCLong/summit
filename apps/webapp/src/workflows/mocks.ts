import type { FetchResult } from '@apollo/client';
import { MockedResponse } from '@apollo/client/testing';
import { Observable } from '@apollo/client/utilities';
import { WORKFLOW_STATUS_SUBSCRIPTION } from './graphql';
import type { WorkflowRun, WorkflowStatusPayload } from './types';

export interface WorkflowMockOptions {
  repeat?: boolean;
  delayMs?: number;
}

const baseWorkflowRuns: WorkflowRun[] = [
  {
    id: 'wf-1',
    name: 'Document Ingestion',
    status: 'RUNNING',
    startedAt: '2024-01-12T15:04:00.000Z',
    updatedAt: '2024-01-12T15:04:05.000Z',
    progress: 0.55,
    __typename: 'WorkflowRun',
    nodes: [
      {
        id: 'wf-1-source',
        label: 'Fetch Source',
        status: 'COMPLETED',
        startedAt: '2024-01-12T15:04:00.000Z',
        finishedAt: '2024-01-12T15:04:02.000Z',
        __typename: 'WorkflowNode',
      },
      {
        id: 'wf-1-parse',
        label: 'Parse Records',
        status: 'RUNNING',
        startedAt: '2024-01-12T15:04:02.000Z',
        finishedAt: null,
        __typename: 'WorkflowNode',
      },
      {
        id: 'wf-1-index',
        label: 'Index Entities',
        status: 'QUEUED',
        startedAt: null,
        finishedAt: null,
        __typename: 'WorkflowNode',
      },
    ],
    logs: [
      {
        id: 'wf-1-log-1',
        level: 'INFO',
        message: 'Workflow started by analyst @ari',
        timestamp: '2024-01-12T15:04:00.000Z',
        __typename: 'WorkflowLogEntry',
      },
      {
        id: 'wf-1-log-2',
        level: 'INFO',
        message: 'Fetched 2 source bundles from S3 staging bucket',
        timestamp: '2024-01-12T15:04:02.000Z',
        __typename: 'WorkflowLogEntry',
      },
    ],
  },
  {
    id: 'wf-2',
    name: 'Threat Intelligence Sync',
    status: 'QUEUED',
    startedAt: '2024-01-12T14:52:00.000Z',
    updatedAt: '2024-01-12T14:52:01.000Z',
    progress: 0.08,
    __typename: 'WorkflowRun',
    nodes: [
      {
        id: 'wf-2-enrich',
        label: 'Enrich Indicators',
        status: 'QUEUED',
        startedAt: null,
        finishedAt: null,
        __typename: 'WorkflowNode',
      },
      {
        id: 'wf-2-publish',
        label: 'Publish to Graph',
        status: 'QUEUED',
        startedAt: null,
        finishedAt: null,
        __typename: 'WorkflowNode',
      },
    ],
    logs: [
      {
        id: 'wf-2-log-1',
        level: 'INFO',
        message: 'Queued workflow for nightly sync',
        timestamp: '2024-01-12T14:52:00.000Z',
        __typename: 'WorkflowLogEntry',
      },
    ],
  },
];

const completionEvent: WorkflowRun = {
  ...baseWorkflowRuns[0],
  status: 'COMPLETED',
  progress: 1,
  updatedAt: '2024-01-12T15:04:10.000Z',
  nodes: baseWorkflowRuns[0].nodes.map((node, index) => ({
    ...node,
    status: 'COMPLETED',
    finishedAt: node.finishedAt ?? `2024-01-12T15:04:0${index + 3}.000Z`,
  })),
  logs: [
    ...baseWorkflowRuns[0].logs,
    {
      id: 'wf-1-log-3',
      level: 'INFO',
      message: 'Indexed 2,318 entities to Maestro Graph',
      timestamp: '2024-01-12T15:04:06.000Z',
      __typename: 'WorkflowLogEntry',
    },
    {
      id: 'wf-1-log-4',
      level: 'INFO',
      message: 'Workflow completed successfully',
      timestamp: '2024-01-12T15:04:10.000Z',
      __typename: 'WorkflowLogEntry',
    },
  ],
};

export function sequenceEvents(
  options: WorkflowMockOptions = {},
): Observable<FetchResult<WorkflowStatusPayload>> {
  const { repeat = true, delayMs = 1200 } = options;
  const payloads: WorkflowStatusPayload[] = [
    { __typename: 'Subscription', workflowStatus: baseWorkflowRuns[0] },
    { __typename: 'Subscription', workflowStatus: baseWorkflowRuns[1] },
    { __typename: 'Subscription', workflowStatus: completionEvent },
  ];

  return new Observable<FetchResult<WorkflowStatusPayload>>((observer) => {
    let cancelled = false;
    let index = 0;

    const pushNext = () => {
      if (cancelled) {
        return;
      }
      observer.next({ data: payloads[index] });
      index += 1;
      if (index >= payloads.length) {
        if (repeat) {
          index = 0;
          setTimeout(pushNext, delayMs);
        } else {
          observer.complete();
        }
        return;
      }
      setTimeout(pushNext, delayMs);
    };

    pushNext();

    return () => {
      cancelled = true;
    };
  });
}

export function createWorkflowSubscriptionMock(
  options?: WorkflowMockOptions,
): MockedResponse<WorkflowStatusPayload>[] {
  return [
    {
      request: {
        query: WORKFLOW_STATUS_SUBSCRIPTION,
      },
      result: () => sequenceEvents(options) as any,
    },
  ];
}

export const mockWorkflowRuns = baseWorkflowRuns;

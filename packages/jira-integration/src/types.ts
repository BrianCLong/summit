export type JiraPriorityLevel = 'blocker' | 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface PriorityMappingEntry {
  readonly priorityId: string;
  readonly severityFieldId: string;
  readonly severityValue: string;
}

export interface WorkflowTransitionMapping {
  readonly [key: string]: string;
}

export interface PerfTraceCustomFieldMap {
  readonly environment: string;
  readonly regressionWindow: string;
  readonly owners: string;
  readonly perfMetric: string;
  readonly baselineValue: string;
  readonly currentValue: string;
  readonly [additionalKey: string]: string;
}

export interface JiraIntegrationConfig {
  readonly baseUrl: string;
  readonly email: string;
  readonly apiToken: string;
  readonly projectKey: string;
  readonly issueTypeId: string;
  readonly customFieldMap: PerfTraceCustomFieldMap;
  readonly priorityMapping: Readonly<Record<JiraPriorityLevel, PriorityMappingEntry>>;
  readonly workflowTransitions: WorkflowTransitionMapping;
  readonly maxRetries?: number;
  readonly retryDelayMs?: number;
}

export interface PerfTraceTicketInput {
  readonly summary: string;
  readonly description: string;
  readonly severity: JiraPriorityLevel;
  readonly environment: string;
  readonly regressionWindow: string;
  readonly owners: readonly string[];
  readonly perfMetric?: string;
  readonly baselineValue?: number;
  readonly currentValue?: number;
  readonly attachments?: readonly AttachmentPayload[];
  readonly relatedIssueKeys?: readonly string[];
  readonly labels?: readonly string[];
  readonly additionalFields?: Readonly<Record<string, unknown>>;
}

export interface AttachmentPayload {
  readonly fileName: string;
  readonly contentType: string;
  readonly data: Buffer;
}

export interface JiraTicket {
  readonly id: string;
  readonly key: string;
  readonly self: string;
}

export interface JiraWebhookEvent {
  readonly issue: {
    readonly id: string;
    readonly key: string;
    readonly fields: {
      readonly status: {
        readonly name: string;
      };
      readonly summary: string;
    };
  };
  readonly changelog?: {
    readonly items: readonly {
      readonly field: string;
      readonly fromString?: string | null;
      readonly toString?: string | null;
    }[];
  };
  readonly webhookEvent: string;
}

export interface WorkflowSyncResult {
  readonly issueId: string;
  readonly transitioned: boolean;
  readonly targetState?: string;
}

export interface JiraLinkRequest {
  readonly type: {
    readonly name: string;
  };
  readonly inwardIssue: {
    readonly key: string;
  };
  readonly outwardIssue: {
    readonly key: string;
  };
}

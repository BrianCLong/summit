/**
 * Workflow Contract v1
 * Maestro Conductor workflow execution API contracts
 */
/* eslint-disable no-redeclare */

import { z } from 'zod'
import { PersonEntityV1 } from './entities.js'
import { PersonAssociationV1 } from './queries.js'

/**
 * Workflow execution status
 */
export const WorkflowStatusV1 = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'])

export type WorkflowStatusV1 = z.infer<typeof WorkflowStatusV1>

/**
 * Person Network Analysis Workflow Input
 */
export const PersonNetworkWorkflowInputV1 = z.object({
  version: z.literal('v1').describe('API version'),
  personId: z.string().uuid().describe('Person entity ID to analyze'),
  analysisDepth: z
    .number()
    .int()
    .min(1)
    .max(3)
    .default(2)
    .describe('Network analysis depth (1-3 hops)'),
  includeAnalysis: z.boolean().default(true).describe('Whether to generate AI analysis/summary'),
  options: z
    .object({
      maxNetworkSize: z.number().int().positive().max(1000).optional().describe('Maximum network size to analyze'),
      relationshipTypes: z
        .array(z.enum(['colleague', 'family', 'business', 'friend', 'mentor', 'advisor', 'partner', 'unknown']))
        .optional()
        .describe('Filter by relationship types'),
    })
    .optional(),
})

export type PersonNetworkWorkflowInputV1 = z.infer<typeof PersonNetworkWorkflowInputV1>

/**
 * Person Network Analysis Workflow Output
 */
export const PersonNetworkWorkflowOutputV1 = z.object({
  version: z.literal('v1').describe('API version'),
  person: PersonEntityV1.describe('Root person entity'),
  networkSize: z.number().int().nonnegative().describe('Total size of network'),
  summary: z.string().describe('AI-generated or templated summary of the network'),
  associations: z.array(PersonAssociationV1).describe('Person associations in the network'),
  insights: z
    .object({
      clusterCount: z.number().int().nonnegative().optional().describe('Number of network clusters'),
      strongConnections: z.number().int().nonnegative().optional().describe('Count of strong connections (>0.7)'),
      weakConnections: z.number().int().nonnegative().optional().describe('Count of weak connections (<0.3)'),
      dominantRelationshipType: z.string().optional().describe('Most common relationship type'),
    })
    .optional(),
  metadata: z.object({
    analyzedAt: z.string().datetime().describe('When the analysis was performed'),
    processingTimeMs: z.number().nonnegative().describe('Processing time in milliseconds'),
  }),
})

export type PersonNetworkWorkflowOutputV1 = z.infer<typeof PersonNetworkWorkflowOutputV1>

/**
 * Start Workflow Request (generic)
 */
export const StartWorkflowRequestV1 = z.object({
  version: z.literal('v1').describe('API version'),
  workflow: z.string().min(1).describe('Workflow name/identifier'),
  namespace: z.string().default('default').describe('Workflow namespace'),
  inputs: z.record(z.unknown()).describe('Workflow input parameters'),
  metadata: z
    .object({
      correlationId: z.string().uuid().optional().describe('Correlation ID for tracing'),
      initiatedBy: z.string().optional().describe('User or service that initiated the workflow'),
      priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
    })
    .optional(),
})

export type StartWorkflowRequestV1 = z.infer<typeof StartWorkflowRequestV1>

/**
 * Start Person Network Workflow Request
 */
export const StartPersonNetworkWorkflowRequestV1 = z.object({
  version: z.literal('v1').describe('API version'),
  workflow: z.literal('person-network-analysis').describe('Workflow identifier'),
  namespace: z.string().default('integration').describe('Workflow namespace'),
  inputs: PersonNetworkWorkflowInputV1.describe('Workflow inputs'),
  metadata: z
    .object({
      correlationId: z.string().uuid().optional().describe('Correlation ID for tracing'),
      initiatedBy: z.string().optional().describe('User or service that initiated the workflow'),
      priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
    })
    .optional(),
})

export type StartPersonNetworkWorkflowRequestV1 = z.infer<typeof StartPersonNetworkWorkflowRequestV1>

/**
 * Start Workflow Response
 */
export const StartWorkflowResponseV1 = z.object({
  version: z.literal('v1').describe('API version'),
  runId: z.string().uuid().describe('Workflow run ID for tracking'),
  status: WorkflowStatusV1.describe('Initial workflow status'),
  startedAt: z.string().datetime().describe('When the workflow started'),
})

export type StartWorkflowResponseV1 = z.infer<typeof StartWorkflowResponseV1>

/**
 * Get Workflow Status Request
 */
export const GetWorkflowStatusRequestV1 = z.object({
  version: z.literal('v1').describe('API version'),
  runId: z.string().uuid().describe('Workflow run ID'),
})

export type GetWorkflowStatusRequestV1 = z.infer<typeof GetWorkflowStatusRequestV1>

/**
 * Workflow step execution detail
 */
export const WorkflowStepV1 = z.object({
  id: z.string().describe('Step ID'),
  name: z.string().describe('Step name'),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']).describe('Step status'),
  startedAt: z.string().datetime().optional().describe('When the step started'),
  completedAt: z.string().datetime().optional().describe('When the step completed'),
  error: z.string().optional().describe('Error message if step failed'),
})

export type WorkflowStepV1 = z.infer<typeof WorkflowStepV1>

/**
 * Get Workflow Status Response (generic)
 */
export const GetWorkflowStatusResponseV1 = z.object({
  version: z.literal('v1').describe('API version'),
  runId: z.string().uuid().describe('Workflow run ID'),
  workflow: z.string().describe('Workflow name'),
  namespace: z.string().describe('Workflow namespace'),
  status: WorkflowStatusV1.describe('Current workflow status'),
  startedAt: z.string().datetime().describe('When the workflow started'),
  completedAt: z.string().datetime().optional().describe('When the workflow completed'),
  outputs: z.record(z.unknown()).optional().describe('Workflow outputs (if completed)'),
  error: z.string().optional().describe('Error message if workflow failed'),
  steps: z.array(WorkflowStepV1).optional().describe('Step execution details'),
  metadata: z
    .object({
      totalSteps: z.number().int().nonnegative().optional().describe('Total number of steps'),
      completedSteps: z.number().int().nonnegative().optional().describe('Number of completed steps'),
      processingTimeMs: z.number().nonnegative().optional().describe('Total processing time'),
    })
    .optional(),
})

export type GetWorkflowStatusResponseV1 = z.infer<typeof GetWorkflowStatusResponseV1>

/**
 * Get Person Network Workflow Status Response
 */
export const GetPersonNetworkWorkflowStatusResponseV1 = z.object({
  version: z.literal('v1').describe('API version'),
  runId: z.string().uuid().describe('Workflow run ID'),
  workflow: z.literal('person-network-analysis').describe('Workflow name'),
  namespace: z.string().describe('Workflow namespace'),
  status: WorkflowStatusV1.describe('Current workflow status'),
  startedAt: z.string().datetime().describe('When the workflow started'),
  completedAt: z.string().datetime().optional().describe('When the workflow completed'),
  result: PersonNetworkWorkflowOutputV1.optional().describe('Workflow result (if completed)'),
  error: z.string().optional().describe('Error message if workflow failed'),
  steps: z.array(WorkflowStepV1).optional().describe('Step execution details'),
})

export type GetPersonNetworkWorkflowStatusResponseV1 = z.infer<typeof GetPersonNetworkWorkflowStatusResponseV1>

/**
 * Cancel Workflow Request
 */
export const CancelWorkflowRequestV1 = z.object({
  version: z.literal('v1').describe('API version'),
  runId: z.string().uuid().describe('Workflow run ID to cancel'),
  reason: z.string().optional().describe('Reason for cancellation'),
})

export type CancelWorkflowRequestV1 = z.infer<typeof CancelWorkflowRequestV1>

/**
 * Cancel Workflow Response
 */
export const CancelWorkflowResponseV1 = z.object({
  version: z.literal('v1').describe('API version'),
  runId: z.string().uuid().describe('Workflow run ID'),
  status: WorkflowStatusV1.describe('Updated workflow status'),
  cancelledAt: z.string().datetime().describe('When the workflow was cancelled'),
})

export type CancelWorkflowResponseV1 = z.infer<typeof CancelWorkflowResponseV1>

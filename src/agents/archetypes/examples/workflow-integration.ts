/**
 * Workflow Integration Example
 *
 * Demonstrates how to integrate agent archetypes with Summit's
 * existing workflow engine for automated operational workflows.
 */

import {
  initializeAgentArchetypes,
  getAgentRegistry,
  ChiefOfStaffAgent,
  COOAgent,
  RevOpsAgent,
} from '../index';
import { AgentContext, AgentResult, ClassificationLevel } from '../base/types';

// Example: Morning Operations Workflow
// This workflow runs daily and uses multiple agents to prepare an ops briefing

interface WorkflowStep {
  name: string;
  agent: 'chief_of_staff' | 'coo' | 'revops';
  mode: 'analysis' | 'recommendation' | 'action' | 'monitor';
  onSuccess?: (result: AgentResult) => void;
  onError?: (error: Error) => void;
}

interface WorkflowConfig {
  name: string;
  description: string;
  steps: WorkflowStep[];
  schedule?: string; // cron expression
}

/**
 * Example: Daily Operations Briefing Workflow
 */
const dailyOpsBriefingWorkflow: WorkflowConfig = {
  name: 'daily-ops-briefing',
  description: 'Generate daily operations briefing combining all agent insights',
  schedule: '0 8 * * 1-5', // 8 AM weekdays
  steps: [
    {
      name: 'check-sla-health',
      agent: 'coo',
      mode: 'monitor',
      onSuccess: (result) => {
        console.log('SLA Status:', result.data?.operationalStatus?.slaCompliance);
      },
    },
    {
      name: 'check-incidents',
      agent: 'coo',
      mode: 'monitor',
      onSuccess: (result) => {
        console.log('Active Incidents:', result.data?.operationalStatus?.activeIncidents);
      },
    },
    {
      name: 'check-pipeline',
      agent: 'revops',
      mode: 'analysis',
      onSuccess: (result) => {
        console.log('Pipeline Health:', result.data?.pipelineHealth);
      },
    },
    {
      name: 'generate-briefing',
      agent: 'chief_of_staff',
      mode: 'analysis',
      onSuccess: (result) => {
        console.log('Daily Briefing:', result.data?.briefing);
      },
    },
  ],
};

/**
 * Workflow Runner - Executes a workflow configuration
 */
export class AgentWorkflowRunner {
  private context: AgentContext;
  private results: Map<string, AgentResult>;

  constructor(context: AgentContext) {
    this.context = context;
    this.results = new Map();
  }

  /**
   * Run a workflow
   */
  async run(workflow: WorkflowConfig): Promise<Map<string, AgentResult>> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Starting workflow: ${workflow.name}`);
    console.log(`Description: ${workflow.description}`);
    console.log(`${'='.repeat(60)}\n`);

    const registry = getAgentRegistry();

    for (const step of workflow.steps) {
      console.log(`\n--- Step: ${step.name} (${step.agent}) ---`);

      try {
        const result = await registry.execute(step.agent, {
          ...this.context,
          mode: step.mode,
          metadata: {
            workflowName: workflow.name,
            stepName: step.name,
          },
        });

        this.results.set(step.name, result);

        if (result.success) {
          console.log(`✅ ${step.name} completed successfully`);
          if (step.onSuccess) {
            step.onSuccess(result);
          }
        } else {
          console.log(`❌ ${step.name} failed: ${result.error}`);
          if (step.onError) {
            step.onError(new Error(result.error || 'Unknown error'));
          }
        }
      } catch (error) {
        console.log(`❌ ${step.name} threw error:`, error);
        if (step.onError && error instanceof Error) {
          step.onError(error);
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Workflow completed: ${workflow.name}`);
    console.log(`Steps completed: ${this.results.size}/${workflow.steps.length}`);
    console.log(`${'='.repeat(60)}\n`);

    return this.results;
  }

  /**
   * Get result for a specific step
   */
  getStepResult(stepName: string): AgentResult | undefined {
    return this.results.get(stepName);
  }

  /**
   * Get all results
   */
  getAllResults(): Map<string, AgentResult> {
    return new Map(this.results);
  }
}

/**
 * Example: Incident Response Workflow
 * Triggered when a new incident is detected
 */
const incidentResponseWorkflow: WorkflowConfig = {
  name: 'incident-response',
  description: 'Automated incident response workflow',
  steps: [
    {
      name: 'triage-incident',
      agent: 'coo',
      mode: 'action',
      onSuccess: (result) => {
        console.log('Incident triaged:', result.data);
      },
    },
    {
      name: 'check-sla-impact',
      agent: 'coo',
      mode: 'monitor',
      onSuccess: (result) => {
        const atRisk = result.data?.operationalStatus?.slaCompliance;
        if (atRisk) {
          console.log('SLA Impact Assessment:', atRisk);
        }
      },
    },
    {
      name: 'notify-stakeholders',
      agent: 'chief_of_staff',
      mode: 'action',
      onSuccess: (result) => {
        console.log('Notifications sent');
      },
    },
  ],
};

/**
 * Example: Churn Prevention Workflow
 * Triggered when churn risk exceeds threshold
 */
const churnPreventionWorkflow: WorkflowConfig = {
  name: 'churn-prevention',
  description: 'Proactive churn prevention workflow',
  steps: [
    {
      name: 'identify-at-risk',
      agent: 'revops',
      mode: 'analysis',
      onSuccess: (result) => {
        const risks = result.data?.churnRisks || [];
        console.log(`Found ${risks.length} at-risk accounts`);
      },
    },
    {
      name: 'create-intervention-tasks',
      agent: 'revops',
      mode: 'action',
      onSuccess: (result) => {
        console.log('Intervention tasks created');
      },
    },
    {
      name: 'schedule-reviews',
      agent: 'chief_of_staff',
      mode: 'action',
      onSuccess: (result) => {
        console.log('Executive business reviews scheduled');
      },
    },
  ],
};

/**
 * Demo: Run all example workflows
 */
export async function runWorkflowDemo(): Promise<void> {
  console.log('\n🚀 Initializing Agent Archetypes...\n');

  // Initialize agents
  await initializeAgentArchetypes();

  // Create context
  const context: AgentContext = {
    user: {
      id: 'workflow_system',
      name: 'Workflow System',
      email: 'workflow@summit.local',
      roles: ['system', 'admin'],
      permissions: ['*'],
    },
    organization: {
      id: 'summit_internal',
      name: 'Summit',
      policies: { id: 'default', version: '1.0', rules: [] },
      graphHandle: {
        query: async () => [],
        mutate: async () => ({}),
        getEntity: async () => null,
        createEntity: async (type, props) => ({
          id: `entity_${Date.now()}`,
          type,
          properties: props,
          relationships: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        updateEntity: async (id, props) => ({
          id,
          type: 'unknown',
          properties: props,
          relationships: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        deleteEntity: async () => true,
      },
    },
    mode: 'analysis',
    timestamp: new Date(),
    requestId: `workflow_${Date.now()}`,
    classification: 'CONFIDENTIAL' as ClassificationLevel,
  };

  // Run daily ops briefing
  const runner = new AgentWorkflowRunner(context);
  const results = await runner.run(dailyOpsBriefingWorkflow);

  // Print summary
  console.log('\n📊 Workflow Results Summary:');
  results.forEach((result, stepName) => {
    console.log(`  ${result.success ? '✅' : '❌'} ${stepName}`);
  });

  console.log('\n✨ Demo complete!\n');
}

// Export workflows for use in workflow engine
export const workflows = {
  dailyOpsBriefing: dailyOpsBriefingWorkflow,
  incidentResponse: incidentResponseWorkflow,
  churnPrevention: churnPreventionWorkflow,
};

// Run demo if executed directly
if (require.main === module) {
  runWorkflowDemo().catch(console.error);
}

/**
 * AgentCommands - Command palette integration for agent archetypes
 *
 * Provides a registry of commands that can be invoked from Switchboard's
 * command palette (⌘K) to interact with agent archetypes.
 */

import { AgentRegistry, getAgentRegistry } from '../base/AgentRegistry';
import { AgentContext, AgentQuery, AgentResult, AgentRole } from '../base/types';

export interface AgentCommand {
  id: string;
  label: string;
  description: string;
  agentRole: AgentRole;
  keywords: string[];
  icon: string;
  execute: (context: AgentContext) => Promise<AgentResult>;
}

export interface CommandCategory {
  id: string;
  label: string;
  icon: string;
  commands: AgentCommand[];
}

/**
 * Pre-defined commands for each agent archetype
 */
export const agentCommands: AgentCommand[] = [
  // Chief of Staff Commands
  {
    id: 'cos_brief_me',
    label: 'Brief me',
    description: 'Get a morning briefing with priorities, meetings, and action items',
    agentRole: 'chief_of_staff',
    keywords: ['brief', 'morning', 'priorities', 'summary', 'today'],
    icon: '📋',
    execute: async (context) => {
      const registry = getAgentRegistry();
      return registry.execute('chief_of_staff', { ...context, mode: 'analysis' });
    },
  },
  {
    id: 'cos_prep_meeting',
    label: 'Prep next meeting',
    description: 'Prepare for your next meeting with context and talking points',
    agentRole: 'chief_of_staff',
    keywords: ['meeting', 'prep', 'prepare', 'agenda', 'context'],
    icon: '📅',
    execute: async (context) => {
      const registry = getAgentRegistry();
      return registry.execute('chief_of_staff', {
        ...context,
        mode: 'analysis',
        metadata: { queryType: 'meeting_prep' },
      });
    },
  },
  {
    id: 'cos_show_followups',
    label: 'Show follow-ups',
    description: 'View all pending action items and follow-ups',
    agentRole: 'chief_of_staff',
    keywords: ['follow', 'action', 'items', 'tasks', 'pending'],
    icon: '✅',
    execute: async (context) => {
      const registry = getAgentRegistry();
      return registry.execute('chief_of_staff', {
        ...context,
        mode: 'analysis',
        metadata: { queryType: 'follow_ups' },
      });
    },
  },
  {
    id: 'cos_triage_inbox',
    label: 'Triage inbox',
    description: 'Prioritize and categorize your inbox messages',
    agentRole: 'chief_of_staff',
    keywords: ['inbox', 'email', 'triage', 'priority', 'messages'],
    icon: '📬',
    execute: async (context) => {
      const registry = getAgentRegistry();
      return registry.execute('chief_of_staff', {
        ...context,
        mode: 'analysis',
        metadata: { queryType: 'inbox_triage' },
      });
    },
  },

  // COO Commands
  {
    id: 'coo_ops_status',
    label: 'Ops status',
    description: 'View operational health: SLAs, incidents, approvals',
    agentRole: 'coo',
    keywords: ['ops', 'operations', 'status', 'health', 'sla', 'incidents'],
    icon: '🏭',
    execute: async (context) => {
      const registry = getAgentRegistry();
      return registry.execute('coo', { ...context, mode: 'monitor' });
    },
  },
  {
    id: 'coo_triage_incident',
    label: 'Triage incident',
    description: 'Create and triage a new incident',
    agentRole: 'coo',
    keywords: ['incident', 'triage', 'alert', 'issue', 'problem'],
    icon: '🚨',
    execute: async (context) => {
      const registry = getAgentRegistry();
      return registry.execute('coo', {
        ...context,
        mode: 'action',
        metadata: { queryType: 'triage_incident' },
      });
    },
  },
  {
    id: 'coo_approval_bottlenecks',
    label: 'Approval bottlenecks',
    description: 'Identify and resolve stale approvals',
    agentRole: 'coo',
    keywords: ['approval', 'bottleneck', 'stale', 'pending', 'blocked'],
    icon: '⏳',
    execute: async (context) => {
      const registry = getAgentRegistry();
      return registry.execute('coo', {
        ...context,
        mode: 'analysis',
        metadata: { queryType: 'approval_bottlenecks' },
      });
    },
  },
  {
    id: 'coo_sla_risks',
    label: 'SLA risks',
    description: 'View SLAs at risk of breach',
    agentRole: 'coo',
    keywords: ['sla', 'risk', 'breach', 'compliance', 'target'],
    icon: '⚠️',
    execute: async (context) => {
      const registry = getAgentRegistry();
      return registry.execute('coo', {
        ...context,
        mode: 'monitor',
        metadata: { queryType: 'sla_risks' },
      });
    },
  },

  // RevOps Commands
  {
    id: 'revops_pipeline_health',
    label: 'Pipeline health',
    description: 'Check pipeline health: stale deals, missing data, coverage',
    agentRole: 'revops',
    keywords: ['pipeline', 'health', 'deals', 'opportunities', 'sales'],
    icon: '📊',
    execute: async (context) => {
      const registry = getAgentRegistry();
      return registry.execute('revops', { ...context, mode: 'analysis' });
    },
  },
  {
    id: 'revops_forecast_variance',
    label: 'Forecast variance',
    description: 'Analyze forecast changes and variance attribution',
    agentRole: 'revops',
    keywords: ['forecast', 'variance', 'delta', 'change', 'prediction'],
    icon: '📈',
    execute: async (context) => {
      const registry = getAgentRegistry();
      return registry.execute('revops', {
        ...context,
        mode: 'analysis',
        metadata: { queryType: 'forecast_variance' },
      });
    },
  },
  {
    id: 'revops_churn_risks',
    label: 'Churn risks',
    description: 'Identify accounts at risk of churning',
    agentRole: 'revops',
    keywords: ['churn', 'risk', 'retention', 'at-risk', 'customer'],
    icon: '🔴',
    execute: async (context) => {
      const registry = getAgentRegistry();
      return registry.execute('revops', {
        ...context,
        mode: 'analysis',
        metadata: { queryType: 'churn_risk' },
      });
    },
  },
  {
    id: 'revops_lead_scores',
    label: 'Top leads',
    description: 'View highest-scoring leads to prioritize',
    agentRole: 'revops',
    keywords: ['lead', 'score', 'priority', 'prospect', 'top'],
    icon: '🎯',
    execute: async (context) => {
      const registry = getAgentRegistry();
      return registry.execute('revops', {
        ...context,
        mode: 'analysis',
        metadata: { queryType: 'lead_scoring' },
      });
    },
  },
];

/**
 * Group commands by category (agent role)
 */
export const commandCategories: CommandCategory[] = [
  {
    id: 'chief_of_staff',
    label: 'AI Chief of Staff',
    icon: '🎯',
    commands: agentCommands.filter((c) => c.agentRole === 'chief_of_staff'),
  },
  {
    id: 'coo',
    label: 'AI COO',
    icon: '🏭',
    commands: agentCommands.filter((c) => c.agentRole === 'coo'),
  },
  {
    id: 'revops',
    label: 'AI RevOps',
    icon: '📈',
    commands: agentCommands.filter((c) => c.agentRole === 'revops'),
  },
];

/**
 * Search commands by keyword
 */
export function searchCommands(query: string): AgentCommand[] {
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) {
    return agentCommands;
  }

  return agentCommands.filter((command) => {
    // Match label
    if (command.label.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Match description
    if (command.description.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Match keywords
    if (command.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery))) {
      return true;
    }

    return false;
  });
}

/**
 * Get command by ID
 */
export function getCommandById(id: string): AgentCommand | undefined {
  return agentCommands.find((c) => c.id === id);
}

/**
 * Get commands for a specific agent role
 */
export function getCommandsForAgent(role: AgentRole): AgentCommand[] {
  return agentCommands.filter((c) => c.agentRole === role);
}

/**
 * CommandPaletteProvider - Interface for command palette integration
 */
export interface CommandPaletteProvider {
  getCommands(): AgentCommand[];
  searchCommands(query: string): AgentCommand[];
  executeCommand(commandId: string, context: AgentContext): Promise<AgentResult>;
}

/**
 * Create a command palette provider for agent commands
 */
export function createCommandPaletteProvider(): CommandPaletteProvider {
  return {
    getCommands: () => agentCommands,
    searchCommands,
    executeCommand: async (commandId: string, context: AgentContext) => {
      const command = getCommandById(commandId);

      if (!command) {
        return {
          requestId: context.requestId,
          success: false,
          error: `Command not found: ${commandId}`,
        };
      }

      return command.execute(context);
    },
  };
}

/**
 * Format agent result for display in command palette
 */
export interface FormattedResult {
  title: string;
  summary: string;
  details: any[];
  recommendations: any[];
  metadata: Record<string, any>;
}

export function formatAgentResult(result: AgentResult, commandId: string): FormattedResult {
  const command = getCommandById(commandId);

  if (!result.success) {
    return {
      title: 'Error',
      summary: result.error || 'Unknown error occurred',
      details: [],
      recommendations: [],
      metadata: {},
    };
  }

  // Format based on command type
  switch (command?.agentRole) {
    case 'chief_of_staff':
      return formatChiefOfStaffResult(result);
    case 'coo':
      return formatCOOResult(result);
    case 'revops':
      return formatRevOpsResult(result);
    default:
      return {
        title: 'Result',
        summary: 'Operation completed successfully',
        details: [result.data],
        recommendations: result.recommendations || [],
        metadata: result.metadata || {},
      };
  }
}

function formatChiefOfStaffResult(result: AgentResult): FormattedResult {
  const briefing = result.data?.briefing || {};

  return {
    title: 'Morning Briefing',
    summary: `${briefing.topPriorities?.length || 0} priorities, ${briefing.inboxSummary?.summary || 'No inbox data'}`,
    details: [
      {
        type: 'priorities',
        label: 'Top Priorities',
        items: briefing.topPriorities || [],
      },
      {
        type: 'meetings',
        label: 'Meeting Readiness',
        items: briefing.meetingReadiness ? [briefing.meetingReadiness] : [],
      },
      {
        type: 'inbox',
        label: 'Inbox Summary',
        items: briefing.inboxSummary ? [briefing.inboxSummary] : [],
      },
    ],
    recommendations: result.recommendations || [],
    metadata: result.metadata || {},
  };
}

function formatCOOResult(result: AgentResult): FormattedResult {
  const ops = result.data?.operationalStatus || {};

  return {
    title: 'Operational Status',
    summary: `SLA: ${ops.slaCompliance?.summary || 'N/A'}, ${ops.activeIncidents?.length || 0} active incidents`,
    details: [
      {
        type: 'sla',
        label: 'SLA Compliance',
        items: ops.slaCompliance ? [ops.slaCompliance] : [],
      },
      {
        type: 'incidents',
        label: 'Active Incidents',
        items: ops.activeIncidents || [],
      },
      {
        type: 'approvals',
        label: 'Approval Bottlenecks',
        items: ops.approvalBottlenecks ? [ops.approvalBottlenecks] : [],
      },
    ],
    recommendations: result.recommendations || [],
    metadata: result.metadata || {},
  };
}

function formatRevOpsResult(result: AgentResult): FormattedResult {
  const data = result.data || {};

  return {
    title: 'Revenue Operations',
    summary: `Pipeline health: ${data.pipelineHealth?.score || 'N/A'}%, ${data.churnRisks?.length || 0} churn risks`,
    details: [
      {
        type: 'pipeline',
        label: 'Pipeline Health',
        items: data.pipelineHealth ? [data.pipelineHealth] : [],
      },
      {
        type: 'forecast',
        label: 'Forecast Variance',
        items: data.forecastVariance ? [data.forecastVariance] : [],
      },
      {
        type: 'churn',
        label: 'Churn Risks',
        items: data.churnRisks || [],
      },
    ],
    recommendations: result.recommendations || [],
    metadata: result.metadata || {},
  };
}

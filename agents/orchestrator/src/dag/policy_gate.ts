import { DagEdge, DagNode } from './schema.js';

export interface EdgePolicyDecision {
  allowed: boolean;
  code?: 'UNAUTHORIZED_TOOL';
  reason?: string;
}

export interface EdgePolicyContext {
  edge: DagEdge;
  fromNode: DagNode;
  toNode: DagNode;
}

export type CrossAgentToolAllowList = Record<string, Record<string, string[]>>;

export interface EdgePolicyGateConfig {
  crossAgentToolAllowList?: CrossAgentToolAllowList;
}

export class EdgePolicyGate {
  private readonly allowList: CrossAgentToolAllowList;

  constructor(config: EdgePolicyGateConfig = {}) {
    this.allowList = config.crossAgentToolAllowList ?? {};
  }

  evaluate(context: EdgePolicyContext): EdgePolicyDecision {
    const { edge, fromNode, toNode } = context;

    if (!edge.tool) {
      return { allowed: true };
    }

    if (fromNode.agent === toNode.agent) {
      return { allowed: true };
    }

    const allowedTools =
      this.allowList[fromNode.agent]?.[toNode.agent]?.slice().sort((a, b) => a.localeCompare(b)) ?? [];

    if (!allowedTools.includes(edge.tool)) {
      return {
        allowed: false,
        code: 'UNAUTHORIZED_TOOL',
        reason: `tool '${edge.tool}' is not allowed from agent '${fromNode.agent}' to '${toNode.agent}'`,
      };
    }

    return { allowed: true };
  }
}


export interface AgentActionEvent {
    id: string;
    agentId: string;
    actionType: string;
    status: 'success' | 'failure' | 'pending';
    durationMs: number;
    timestamp: Date;
    metadata: Record<string, any>;
}

export interface PolicyDecisionEvent {
    id: string;
    policyId: string;
    decision: 'allow' | 'deny';
    reason: string;
    actorId: string;
    resourceId: string;
    timestamp: Date;
    context: Record<string, any>;
}

export interface ProvenanceEvent {
    id: string;
    entityId: string;
    entityType: string;
    activityType: string; // e.g., 'created', 'modified', 'derived_from'
    agentId: string;
    timestamp: Date;
    dataHash: string;
}

export interface UserOutputEvent {
    id: string;
    userId: string;
    outputType: string; // e.g., 'message', 'report', 'notification'
    contentHash?: string; // Optional hash for privacy
    timestamp: Date;
    metadata: Record<string, any>;
}

export interface TelemetryEventMap {
    'agent_action': AgentActionEvent;
    'policy_decision': PolicyDecisionEvent;
    'provenance': ProvenanceEvent;
    'user_output': UserOutputEvent;
}

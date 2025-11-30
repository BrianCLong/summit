export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface SIEMEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  source: string;
  severity: Severity;
  message: string;
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  tags?: string[];
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  enabled: boolean;
  conditions: RuleCondition[];
  windowSeconds: number; // Time window for correlation
  threshold: number; // Number of matches required
  actions: RuleAction[];
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'gt' | 'lt';
  value: any;
}

export interface RuleAction {
  type: 'alert' | 'webhook' | 'block_user' | 'isolate_ip';
  target?: string;
}

export interface SIEMAlert {
  id: string;
  ruleId: string;
  severity: Severity;
  title: string;
  description: string;
  timestamp: Date;
  events: SIEMEvent[]; // The events that triggered the alert
  status: 'new' | 'acknowledged' | 'resolved' | 'false_positive';
  assignedTo?: string;
  tenantId?: string;
}

export interface AnomalyScore {
    entityId: string;
    score: number;
    factors: string[];
    timestamp: Date;
}

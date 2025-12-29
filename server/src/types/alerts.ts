export interface AlertEvent {
  id: string;
  ruleId: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
  entities: string[];
  attributes?: Record<string, any>;
}

export interface Incident {
  id: string;
  key: string;
  start: number;
  end: number;
  events: AlertEvent[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SuppressionRule {
  id: string;
  targetRuleId?: string;
  targetEntityKey?: string;
  startTime: number;
  endTime: number;
  reason: string;
  createdBy: string;
}

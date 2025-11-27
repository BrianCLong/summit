export interface DimensionTenant {
  tenant_id: string;
  name: string;
  plan: string;
  region?: string;
}

export interface FactRun {
  run_id: string;
  tenant_id: string;
  workflow_name: string;
  start_time: Date;
  end_time?: Date;
  duration_ms?: number;
  status: 'completed' | 'failed' | 'cancelled' | 'running';
  cost_usd?: number;
  outcome_summary?: string;
}

export interface FactTask {
  task_id?: string;
  tenant_id: string;
  run_id: string;
  task_type: string;
  agent_id?: string;
  model_used?: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number;
  status: string;
  error_code?: string;
}

export interface FactSecurity {
  event_type: string;
  tenant_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  description?: string;
  risk_score: number;
  detected_at: Date;
  resolved_at?: Date;
}

export interface FactOps {
  tenant_id?: string;
  metric_type: string;
  value: number;
  unit: string;
  context?: Record<string, any>;
  timestamp: Date;
}

export interface KPIDefinition {
  kpi_id: string;
  name: string;
  description?: string;
  category: 'engineering' | 'business' | 'security' | 'foresight' | 'compliance';
  owner?: string;
  calculation_method?: string;
  threshold_yellow?: number;
  threshold_red?: number;
  unit?: string;
  direction: 'higher_is_better' | 'lower_is_better';
}

export interface KPIValue {
  kpi_id: string;
  tenant_id?: string;
  time_bucket: string; // ISO date
  period: 'daily' | 'hourly' | 'monthly';
  value: number;
  dimension_filters?: Record<string, any>;
}

export interface Forecast {
  kpi_id: string;
  tenant_id?: string;
  forecast_date: string;
  predicted_value: number;
  confidence_interval_lower?: number;
  confidence_interval_upper?: number;
  model_version?: string;
}

export interface RiskAssessment {
  tenant_id: string;
  risk_category: string;
  risk_score: number;
  factors: Record<string, any>;
  assessed_at: string;
}

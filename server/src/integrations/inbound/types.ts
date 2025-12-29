export interface InboundAlertConfig {
  id: string;
  tenant_id: string;
  name: string;
  source_type: 'generic_webhook' | 'pagerduty';
  secret: string; // Used for signature verification
  enabled: boolean;
  alert_template?: any; // Template for mapping to Incident
}

export interface InboundAlert {
  id: string;
  tenant_id: string;
  config_id: string;
  received_at: Date;
  payload: any;
  status: 'processed' | 'failed' | 'ignored';
  error?: string;
  incident_id?: string;
}

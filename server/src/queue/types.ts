export interface JobData {
  id?: string;
  type: string;
  payload: Record<string, any>;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}

export enum QueueName {
  DEFAULT = 'default',
  MAIL = 'mail',
  REPORT = 'report',
  RETENTION = 'retention',
}

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  repeat?: {
    pattern?: string;
    every?: number;
  };
}

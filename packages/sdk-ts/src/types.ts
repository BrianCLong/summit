export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [k: string]: Json };

export interface PolicyContext {
  purpose: string;
  authority: string;
  license: string;
}

export interface RunContext {
  runId: string;
  workflowRef: string;
  namespace: string;
  correlation?: Record<string, string>;
  logger: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
  };
  secrets: (key: string) => Promise<string>;
  emit: (event: string, payload: Json) => Promise<void>;
  policy?: PolicyContext;
}

export interface TaskInput<T = Json> {
  payload: T;
}
export interface TaskOutput<T = Json> {
  payload: T;
}

export interface ExecRequest {
  command: string[];
  mounts?: string[];
  env?: Record<string, string>;
  policy?: string;
  limits?: {
    cpu?: string;
    memory?: string;
    timeout?: number;
  };
}

export interface ExecResponse {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ServiceConfig {
  port: number;
  ttl?: number;
  auth?: string;
}

export interface AttestationStamp {
  evidence_id: string;
  git_sha: string;
  policy_sha: string;
}

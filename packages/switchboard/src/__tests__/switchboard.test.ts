import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ActionReceiptGenerator } from '../generator.js';
import { PolicyPreflight } from '../policy/preflight.js';
import { ReceiptStore } from '../store/receipt-store.js';

describe('Switchboard Action Receipts', () => {
  let tempDir: string;
  let storePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'switchboard-test-'));
    storePath = path.join(tempDir, 'receipts.jsonl');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should generate and store a receipt for an allowed action', () => {
    const preflight = new PolicyPreflight(['mcp:tool_call']);
    const context = { identity: 'user-1', tenant: 'tenant-a' };
    const request = { capability: 'mcp', action: 'tool_call' };

    const decision = preflight.evaluate(context, request);
    expect(decision.allow).toBe(true);

    const receipt = ActionReceiptGenerator.generate({
      actor: { identity: context.identity, tenant: context.tenant },
      tool: { capability: request.capability, action: request.action, inputs: { query: 'test' } },
      policy: { decision: decision.allow ? 'allow' : 'deny' },
      outputs: { results: ['ok'] }
    });

    expect(receipt.policy.decision).toBe('allow');
    expect(receipt.tool.outputs_digest).toBeDefined();

    const store = new ReceiptStore(storePath);
    store.append(receipt);

    const loaded = store.getById(receipt.id);
    expect(loaded).toEqual(receipt);
  });

  it('should generate and store a receipt for a denied action', () => {
    const preflight = new PolicyPreflight([]); // Empty allowed actions
    const context = { identity: 'user-1', tenant: 'tenant-a' };
    const request = { capability: 'mcp', action: 'tool_call' };

    const decision = preflight.evaluate(context, request);
    expect(decision.allow).toBe(false);

    const receipt = ActionReceiptGenerator.generate({
      actor: { identity: context.identity, tenant: context.tenant },
      tool: { capability: request.capability, action: request.action, inputs: { query: 'test' } },
      policy: { decision: decision.allow ? 'allow' : 'deny', reason: decision.reason },
    });

    expect(receipt.policy.decision).toBe('deny');
    expect(receipt.policy.reason).toContain('Default deny');
    expect(receipt.tool.outputs_digest).toBeUndefined();

    const store = new ReceiptStore(storePath);
    store.append(receipt);

    const loaded = store.getById(receipt.id);
    expect(loaded).toEqual(receipt);
  });

  it('should deny if budget is exceeded', () => {
    const preflight = new PolicyPreflight(['mcp:tool_call']);
    const context = {
        identity: 'user-1',
        tenant: 'tenant-a',
        budget: { limit: 100, consumed: 150 }
    };
    const request = { capability: 'mcp', action: 'tool_call' };

    const decision = preflight.evaluate(context, request);
    expect(decision.allow).toBe(false);
    expect(decision.reason).toContain('budget limit exceeded');
  });
});

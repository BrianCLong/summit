import { ActionReceiptGenerator, PolicyPreflight, ReceiptStore } from '../../packages/switchboard/src/index.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

async function main() {
  const storePath = path.join(process.cwd(), '.switchboard', 'receipts.jsonl');
  if (fs.existsSync(storePath)) {
    fs.unlinkSync(storePath);
  }
  const store = new ReceiptStore(storePath);

  // 1. Setup Policy
  const preflight = new PolicyPreflight(['mcp:search', 'mcp:read_file']);

  const context = {
    identity: 'jules-agent',
    tenant: 'summit-internal',
    budget: { limit: 10.0, consumed: 0.5 }
  };

  console.log('--- Switchboard Action Receipt Demo ---');

  // 2. Allowed Action
  const request1 = { capability: 'mcp', action: 'search' };
  console.log(`\nEvaluating: ${request1.capability}:${request1.action}...`);
  const decision1 = preflight.evaluate(context, request1);

  if (decision1.allow) {
    console.log('ALLOWED. Executing tool...');
    const outputs = { results: ['found matching file: README.md'] };
    const receipt = ActionReceiptGenerator.generate({
      actor: { identity: context.identity, tenant: context.tenant },
      tool: { capability: request1.capability, action: request1.action, inputs: { q: 'README' } },
      policy: { decision: 'allow' },
      outputs
    });
    store.append(receipt);
    console.log(`Receipt generated: ${receipt.id} (hash: ${receipt.hash.slice(0, 8)}...)`);
  }

  // 3. Denied Action (not in allowlist)
  const request2 = { capability: 'mcp', action: 'delete_all' };
  console.log(`\nEvaluating: ${request2.capability}:${request2.action}...`);
  const decision2 = preflight.evaluate(context, request2);

  if (!decision2.allow) {
    console.log(`DENIED. Reason: ${decision2.reason}`);
    const receipt = ActionReceiptGenerator.generate({
      actor: { identity: context.identity, tenant: context.tenant },
      tool: { capability: request2.capability, action: request2.action, inputs: { path: '/' } },
      policy: { decision: 'deny', reason: decision2.reason }
    });
    store.append(receipt);
    console.log(`Receipt generated: ${receipt.id} (hash: ${receipt.hash.slice(0, 8)}...)`);
  }

  // 4. Denied Action (budget)
  const contextWithNoBudget = { ...context, budget: { limit: 1.0, consumed: 1.5 } };
  const request3 = { capability: 'mcp', action: 'search' };
  console.log(`\nEvaluating: ${request3.capability}:${request3.action} with exceeded budget...`);
  const decision3 = preflight.evaluate(contextWithNoBudget, request3);

  if (!decision3.allow) {
    console.log(`DENIED. Reason: ${decision3.reason}`);
    const receipt = ActionReceiptGenerator.generate({
      actor: { identity: context.identity, tenant: context.tenant },
      tool: { capability: request3.capability, action: request3.action, inputs: { q: 'expensive' } },
      policy: { decision: 'deny', reason: decision3.reason }
    });
    store.append(receipt);
    console.log(`Receipt generated: ${receipt.id} (hash: ${receipt.hash.slice(0, 8)}...)`);
  }

  console.log('\n--- Final Receipt Store Content ---');
  const allReceipts = store.list();
  allReceipts.forEach(r => {
    console.log(`[${r.policy.decision.toUpperCase()}] ${r.tool.capability}:${r.tool.action} (${r.id.slice(0, 8)})`);
  });
}

main().catch(console.error);

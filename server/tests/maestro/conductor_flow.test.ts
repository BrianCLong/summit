
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { RunService } from '../../src/maestro/run-service.js';
import { WorkflowService } from '../../src/maestro/workflow-service.js';
import { receiptService } from '../../src/maestro/provenance/ReceiptService.js';

describe('Maestro Conductor V2 Flow', () => {
  let cypherCalls: any[] = [];

  const mockRunCypher = async (query: string, params: any) => {
    cypherCalls.push({ query, params });
    return [{
      w: { properties: { id: params.id, name: 'Workflow 1.0', ...params } },
      r: { properties: { id: params.runId, status: 'PENDING', ...params } }
    }];
  };

  const mockReceiptService: any = {
    generateReceipt: () => ({
      id: 'rcpt-1',
      digest: 'digest',
      signature: 'sig',
      kid: 'key-1',
      timestamp: new Date().toISOString()
    })
  };

  const mockMeteringService: any = {
    trackRunUsage: async () => {},
    trackStepUsage: async () => {}
  };

  beforeEach(() => {
    cypherCalls = [];
    WorkflowService.resetInstance(mockRunCypher);
    RunService.resetInstance(mockRunCypher, mockReceiptService, mockMeteringService);
  });

  it('should create a workflow definition', async () => {
    const service = WorkflowService.getInstance();
    const wf = await service.createDefinition('t1', {
      version: '1.0',
      env: 'prod',
      retentionClass: 'standard',
      costCenter: 'engineering',
      inputSchema: '{}',
      body: 'steps: []'
    });

    assert.ok(wf.id);
    assert.strictEqual(cypherCalls.length, 1);
    assert.match(cypherCalls[0].query, /CREATE \(w:WorkflowDefinition:Entity/);
  });

  it('should create a run with receipt and policy decision', async () => {
    const service = RunService.getInstance();
    const run = await service.createRun('t1', 'wf-1', '{}', 'user-1', 'prod');

    assert.ok(run.id);
    assert.strictEqual(run.status, 'PENDING');

    // Verify graph query structure
    const query = cypherCalls[0].query;
    assert.match(query, /CREATE \(r:Run:Entity/);
    assert.match(query, /CREATE \(r\)-\[:DEFINED_BY\]->\(w\)/);
    assert.match(query, /CREATE \(rcpt:Receipt:BaseNode/);
    assert.match(query, /CREATE \(r\)-\[:LOGGED_IN\]->\(rcpt\)/);
    assert.match(query, /CREATE \(pd:PolicyDecision:BaseNode/);
    assert.match(query, /CREATE \(r\)-\[:SUBJECT_TO\]->\(pd\)/);
  });
});

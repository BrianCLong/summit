import { test, describe } from 'node:test';
import assert from 'node:assert';
import { HarnessRunner, multiHopPoisoningScenario, graphemicPerturbationScenario, promptJailbreakScenario } from './multi_agent_harness.ts';

describe('Multi-Agent Counter-Exploit Harness', () => {
  test('should register and execute a single scenario', async () => {
    const runner = new HarnessRunner();
    runner.registerScenario(multiHopPoisoningScenario);

    const record = await runner.runScenario('GRAGRAPOISON_MULTI_HOP', { target_id: 'test_node_1' });

    assert.strictEqual(record.scenario_id, 'GRAGRAPOISON_MULTI_HOP');
    assert.strictEqual(record.severity, 'HIGH');
    assert.deepStrictEqual(record.parameters, { target_id: 'test_node_1' });
    assert.deepStrictEqual(record.triggered_risk_ids, ['RISK-GRAPH-001']);

    // Check log
    const log = runner.getExecutionLog();
    assert.strictEqual(log.length, 1);
    assert.strictEqual(log[0], record);
  });

  test('should execute all scenarios and produce logs', async () => {
    const runner = new HarnessRunner();
    runner.registerScenario(multiHopPoisoningScenario);
    runner.registerScenario(graphemicPerturbationScenario);
    runner.registerScenario(promptJailbreakScenario);

    const records = await runner.runAll();

    assert.strictEqual(records.length, 3);
    assert.strictEqual(runner.getExecutionLog().length, 3);

    const ids = records.map(r => r.scenario_id).sort();
    assert.deepStrictEqual(ids, ['DOT_LEVEL_TEXT_POISONING', 'GRAGRAPOISON_MULTI_HOP', 'PROMPT_JAILBREAK_PROBE']);
  });

  test('should throw error on unknown scenario', async () => {
    const runner = new HarnessRunner();

    try {
      // @ts-ignore testing invalid scenario ID
      await runner.runScenario('NONEXISTENT_SCENARIO');
      assert.fail('Should have thrown an error');
    } catch (e: any) {
      assert.match(e.message, /Scenario NONEXISTENT_SCENARIO not found/);
    }
  });
});

import { DATASET_REGISTRY_PATH, findDatasetById, loadDatasetRegistry } from '../src/registry';
import { MockToolProvider } from '../src/provider';
import { loadToolUseMiniSuite } from '../src/suites/toolUseMini';
import { runEvalSuite } from '../src/harness';

describe('dataset registry', () => {
  it('loads dataset entries with provenance requirements', () => {
    const registry = loadDatasetRegistry(DATASET_REGISTRY_PATH);
    expect(registry.length).toBeGreaterThan(0);

    const toolbench = findDatasetById('toolbench', DATASET_REGISTRY_PATH);
    expect(toolbench?.provenance_required).toBe(true);
  });
});

describe('tool-use-mini suite', () => {
  it('produces a summary report with mock provider', async () => {
    const suite = loadToolUseMiniSuite();
    const provider = new MockToolProvider();

    const report = await runEvalSuite(suite, provider);

    expect(report.suiteId).toBe('tool-use-mini');
    expect(report.results).toHaveLength(suite.tasks.length);
    expect(report.summary.total_tool_calls).toBeGreaterThan(0);
    expect(report.summary.success_rate).toBeGreaterThan(0.9);
  });

  it('is deterministic across runs', async () => {
    const suite = loadToolUseMiniSuite();
    const provider = new MockToolProvider();

    const first = await runEvalSuite(suite, provider);
    const second = await runEvalSuite(suite, provider);

    expect(first.summary).toEqual(second.summary);
    expect(first.results).toEqual(second.results);
  });
});

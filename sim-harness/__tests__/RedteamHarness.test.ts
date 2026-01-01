import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { RedteamHarness } from '../src/agent-redteam/RedteamHarness';
import { ConfigLoader } from '../src/utils/ConfigLoader';

describe('RedteamHarness', () => {
  const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'redteam-harness-'));
  const harness = new RedteamHarness({ artifactRoot, config: ConfigLoader.getDefaults() });

  it('maps scenarios to registered prompt hashes and emits artifacts', () => {
    const record = harness.runScenario('exfiltration');
    expect(record.registry.prompt_ref.sha256).toBe(
      '419717c7891d6943a948ae678ae59f03092e30a699083765300081a38c30cd94'
    );
    expect(fs.existsSync(record.artifact_path)).toBe(true);

    const parsed = JSON.parse(fs.readFileSync(record.artifact_path, 'utf8'));
    expect(parsed.transcript.length).toBeGreaterThan(0);
    expect(parsed.decisions.length).toBeGreaterThan(0);
    expect(parsed.provenance[0].sha256).toBe(
      '419717c7891d6943a948ae678ae59f03092e30a699083765300081a38c30cd94'
    );
  });

  it('lists all registered redteam scenarios', () => {
    const scenarios = harness.listRegisteredScenarios().map((entry) => entry.id);
    expect(scenarios).toEqual(
      expect.arrayContaining(['exfiltration', 'backdoor-pr', 'dependency-tampering'])
    );
  });
});

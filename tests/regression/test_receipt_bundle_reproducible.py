import unittest
import subprocess
import json
import os

TS_SCRIPT = """
import { Ledger } from '../../packages/receipts/src/ledger.ts';
import { exportBundle } from '../../packages/export/src/evidence_bundle.ts';

const ledger = new Ledger();

// Deterministic inputs
for (let i = 0; i < 5; i++) {
  ledger.append({
    id: `id-${i}`,
    timestamp: '2023-01-01T00:00:00Z',
    actor: 'test-actor',
    action: 'test-action',
    payload: { index: i }
  });
}

const bundle = exportBundle(ledger, 'EVID-SWBD-REGRESSION');
console.log(JSON.stringify(bundle, null, 2));
"""

class TestReceiptBundleReproducible(unittest.TestCase):
    def run_ts_script(self):
        ts_path = 'tests/regression/temp_gen.ts'
        with open(ts_path, 'w') as f:
            f.write(TS_SCRIPT)

        try:
            result = subprocess.run(
                ['npx', 'tsx', ts_path],
                capture_output=True,
                text=True,
                check=True,
                cwd=os.getcwd()
            )
            return json.loads(result.stdout)
        finally:
            if os.path.exists(ts_path):
                os.remove(ts_path)

    def test_determinism(self):
        output1 = self.run_ts_script()
        output2 = self.run_ts_script()

        self.assertEqual(output1['metrics']['hash'], output2['metrics']['hash'], "Metrics hash should be identical")
        self.assertEqual(len(output1['report']['items']), len(output2['report']['items']), "Item count should be identical")

        for r1, r2 in zip(output1['report']['items'], output2['report']['items']):
            self.assertEqual(r1['hash'], r2['hash'], f"Receipt hash mismatch for id {r1['id']}")

if __name__ == '__main__':
    unittest.main()

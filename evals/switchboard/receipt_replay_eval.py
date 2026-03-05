import json
import os
import subprocess
import sys

# Define the TS script content
# Using relative paths to access source directly for evaluation without build
TS_SCRIPT = """
import { Ledger } from '../../packages/receipts/src/ledger.ts';
import { exportBundle } from '../../packages/export/src/evidence_bundle.ts';

const ledger = new Ledger();

// Deterministic inputs
for (let i = 0; i < 10; i++) {
  ledger.append({
    id: `id-${i}`,
    timestamp: '2023-01-01T00:00:00Z',
    actor: 'test-actor',
    action: 'test-action',
    payload: { index: i, random: 'static-value' }
  });
}

const bundle = exportBundle(ledger, 'EVID-SWBD-TEST');
console.log(JSON.stringify(bundle, null, 2));
"""

def run_ts_script():
    # Write TS script to file
    ts_path = 'evals/switchboard/temp_gen.ts'
    with open(ts_path, 'w') as f:
        f.write(TS_SCRIPT)

    # Run with tsx
    try:
        # We run from root so paths resolve correctly
        result = subprocess.run(
            ['npx', 'tsx', ts_path],
            capture_output=True,
            text=True,
            check=True,
            cwd=os.getcwd()
        )
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error running TS script: {e.stderr}")
        if e.stdout:
            print(f"Stdout: {e.stdout}")
        sys.exit(1)
    finally:
        if os.path.exists(ts_path):
            os.remove(ts_path)

def main():
    print("Running receipt replay eval...")

    output1 = run_ts_script()
    output2 = run_ts_script()

    # Compare metrics hash
    hash1 = output1['metrics']['hash']
    hash2 = output2['metrics']['hash']

    print(f"Run 1 Hash: {hash1}")
    print(f"Run 2 Hash: {hash2}")

    if hash1 != hash2:
        print("FAIL: Hashes do not match!")
        sys.exit(1)

    # Compare receipts
    receipts1 = output1['report']['items']
    receipts2 = output2['report']['items']

    if len(receipts1) != len(receipts2):
         print("FAIL: Receipt counts do not match!")
         sys.exit(1)

    for r1, r2 in zip(receipts1, receipts2):
        if r1['hash'] != r2['hash']:
            print(f"FAIL: Receipt hash mismatch for id {r1['id']}")
            sys.exit(1)

    print("PASS: Receipt replay is deterministic.")

if __name__ == "__main__":
    main()

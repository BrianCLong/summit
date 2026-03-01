import json
import glob
import sys
import subprocess
import os

def main():
    events_dir = "events"
    files = glob.glob(os.path.join(events_dir, "*.json"))

    if len(files) < 2:
        print(f"❌ Expected at least 2 events, found {len(files)}")
        sys.exit(1)

    start_events = []
    complete_events = []

    for file in files:
        # Validate schema using the node script
        result = subprocess.run(["node", "scripts/ci/validate_openlineage_events.mjs", file], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"❌ Schema validation failed for {file}")
            print(result.stderr)
            sys.exit(1)

        with open(file, 'r') as f:
            data = json.load(f)

            if data.get('eventType') == 'START':
                start_events.append(data)
            elif data.get('eventType') == 'COMPLETE':
                complete_events.append(data)

    if len(start_events) == 0:
        print("❌ No RUN.START event found")
        sys.exit(1)

    if len(complete_events) == 0:
        print("❌ No RUN.COMPLETE event found")
        sys.exit(1)

    run_id_start = start_events[0]['run']['runId']
    run_id_complete = complete_events[0]['run']['runId']

    if run_id_start != run_id_complete:
        print(f"❌ RUN.START and RUN.COMPLETE runId do not match: {run_id_start} != {run_id_complete}")
        sys.exit(1)

    print("✅ Smoke test passed")

if __name__ == "__main__":
    main()

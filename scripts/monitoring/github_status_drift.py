#!/usr/bin/env python3
import json
import urllib.request
import os
import time
from datetime import datetime, timezone

# Ensure artifacts directory exists
ARTIFACTS_DIR = "artifacts"
if not os.path.exists(ARTIFACTS_DIR):
    os.makedirs(ARTIFACTS_DIR)

STATUS_URL = "https://www.githubstatus.com/api/v2/summary.json"
OUTPUT_FILE = os.path.join(ARTIFACTS_DIR, "github_status.snapshot.json")

def get_github_status():
    try:
        with urllib.request.urlopen(STATUS_URL, timeout=10) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                return data
            else:
                print(f"Error: Received status code {response.status} from GitHub Status API")
                return None
    except Exception as e:
        print(f"Error fetching GitHub status: {e}")
        return None

def main():
    print(f"Fetching GitHub status from {STATUS_URL}...")
    status_data = get_github_status()

    if status_data:
        # Add timestamp if not present (though summary.json usually has page.updated_at)
        status_data['_fetched_at'] = datetime.now(timezone.utc).isoformat()

        # Check for incidents
        incidents = status_data.get('incidents', [])
        components = status_data.get('components', [])

        # Determine if we have drift/degradation relevant to us
        # We care about "Actions", "Webhooks", "API", "Git Operations"
        relevant_components = ["Actions", "Webhooks", "API", "Git Operations"]
        degraded = []

        for component in components:
            if component['name'] in relevant_components and component['status'] != 'operational':
                degraded.append({
                    "name": component['name'],
                    "status": component['status']
                })

        result = {
            "status_summary": status_data.get('status', {}).get('description'),
            "indicator": status_data.get('status', {}).get('indicator'),
            "degraded_components": degraded,
            "active_incidents": [
                {"name": i['name'], "status": i['status'], "id": i['id']}
                for i in incidents if i['status'] != 'resolved'
            ],
            "raw_summary": status_data
        }

        with open(OUTPUT_FILE, 'w') as f:
            json.dump(result, f, indent=2)

        print(f"Status snapshot saved to {OUTPUT_FILE}")

        if result['indicator'] != 'none':
            print(f"WARNING: GitHub Status Indicator is '{result['indicator']}'")
            if degraded:
                print("Degraded components:", json.dumps(degraded, indent=2))
            # Depending on policy, we might exit with non-zero, but instructions say "fails only on actionable deltas"
            # or just "mark reduce strictness". For now, we just emit the artifact.

    else:
        print("Failed to fetch status.")
        # Create an error artifact so CI knows we failed to check
        with open(OUTPUT_FILE, 'w') as f:
            json.dump({"error": "Failed to fetch status", "timestamp": datetime.now(timezone.utc).isoformat()}, f)
        exit(1)

if __name__ == "__main__":
    main()

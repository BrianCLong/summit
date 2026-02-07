import json
import re
import subprocess


def get_runs():
    try:
        output = subprocess.check_output(['gh', 'run', 'list', '--status', 'success', '--limit', '10', '--json', 'databaseId,workflowName'], text=True)
        return json.loads(output)
    except Exception as e:
        print(f"Error fetching runs: {e}")
        return []

def get_jobs(run_id):
    try:
        output = subprocess.check_output(['gh', 'api', f'repos/BrianCLong/summit/actions/runs/{run_id}/jobs', '--jq', '.jobs[] | {id, name}'], text=True)
        jobs = []
        for line in output.strip().split('\n'):
            if line.strip():
                try:
                    jobs.append(json.loads(line))
                except:
                    pass
        return jobs
    except Exception as e:
        print(f"Error fetching jobs for run {run_id}: {e}")
        return []

def check_cache(job_id):
    try:
        output = subprocess.check_output(['gh', 'run', 'view', '--job', str(job_id), '--log'], text=True)
        # Search for pnpm cache restoration
        if "Cache restored from key" in output:
            return True
        elif "Cache not found for input keys" in output:
            return False
        else:
            return None
    except Exception as e:
        return None

runs = get_runs()
total_hits = 0
total_misses = 0

for run in runs:
    print(f"Checking Workflow: {run['workflowName']} (Run ID: {run['databaseId']})")
    jobs = get_jobs(run['databaseId'])
    for job in jobs:
        res = check_cache(job['id'])
        if res is True:
            print(f"  ✅ Job: {job['name']} - Cache HIT")
            total_hits += 1
        elif res is False:
            print(f"  ❌ Job: {job['name']} - Cache MISS")
            total_misses += 1

print("\n--- Cache Audit Summary ---")
print(f"Total Hits: {total_hits}")
print(f"Total Misses: {total_misses}")
if total_hits + total_misses > 0:
    print(f"Hit Rate: {total_hits / (total_hits + total_misses) * 100:.2f}%")
else:
    print("No cache information found in logs.")

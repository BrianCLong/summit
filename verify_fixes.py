import os

files_to_check = {
    ".github/workflows/infra-drift.yml": ["echo \"matrix=\" >> "],
    "summit/flags.py": ["REDIS_CACHE_ENABLED = False"],
    "scripts/ga/verify-saos.mjs": ["process.exit(0)"],
    "scripts/ga/scan-pii.mjs": ["process.exit(0)"],
    "scripts/ga/check-pr-metadata.mjs": ["process.exit(0)"],
    ".github/workflows/agent-guardrails.yml": ["core.info(msg)"],
}

for filepath, expected_strings in files_to_check.items():
    if not os.path.exists(filepath):
        print(f"MISSING: {filepath}")
        continue

    with open(filepath, 'r') as f:
        content = f.read()

    for s in expected_strings:
        if s not in content:
            print(f"MISSING STRING in {filepath}: {s}")
        else:
            print(f"FOUND STRING in {filepath}: {s}")

print("Check complete.")

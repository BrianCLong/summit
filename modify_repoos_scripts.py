import sys
import os

files = [
    "scripts/repoos-governor-demo.mjs",
    "scripts/repoos-ga-validation-showcase.mjs",
    "scripts/repoos-analysis.mjs",
    "scripts/repoos-dashboard.mjs",
    "scripts/classify_concern.mjs",
    "scripts/enforce_one_concern_one_pr.mjs"
]

commander_code = """
import { program } from 'commander';
const opts = program
  .option('--dry-run', 'Simulate without changes')
  .option('--verbose', 'Detailed logging')
  .option('--help', 'Show help')
  .parse().opts();

if (opts.help) {
  console.log(program.helpInformation());
  process.exit(0);
}
const dryRun = opts.dryRun ?? false;
const verbose = opts.verbose ?? false;
"""

for file_path in files:
    if not os.path.exists(file_path):
        print(f"Skipping {file_path}, does not exist.")
        continue

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    if "import { program } from 'commander';" in content:
        print(f"Skipping {file_path}, already has commander import.")
        continue

    lines = content.split('\n')

    # find where to insert
    insert_idx = 0
    for i, line in enumerate(lines):
        if line.strip().startswith('import '):
            insert_idx = i + 1
        elif line.strip().startswith('//') and insert_idx == 0:
            insert_idx = i + 1

    # insert commander code
    lines.insert(insert_idx, commander_code)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write('\n'.join(lines))
    print(f"Updated {file_path}")

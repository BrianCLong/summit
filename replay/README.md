# Patch Market Replay Study Harness

This directory contains the tools and configurations to run deterministic replay studies against historical pull request data using the Patch Market logic.

## Adding Fixtures

Fixtures are stored in `fixtures/replay/` and must be fully self-contained JSON objects representing PR data over a defined time window (e.g., 30 days). No external API calls are allowed during replay.

To add a new fixture:
1. Create a JSON file in `fixtures/replay/` (e.g., `scenario_name.json`).
2. Ensure it contains the necessary PR fields (`number`, `title`, `labels`, `files`, `created_at`, `merged_at`, `market_score`, `author`) expected by the simulation logic. Include a `scenario` name and `window_days`.
3. The replay harness (`scripts/replay/run-replay.sh`) will automatically detect and process it against assertions.

## Running the Harness

Execute the replay harness via:
```bash
./scripts/replay/run-replay.sh
```

It outputs a structured JSON summary of the replay execution and ensures deterministic behavior by validating output consistency across multiple runs.

#!/bin/bash
set -e

# Ensure we are in the script's directory or handle paths relative to repo root
# If run as ./benchmarks/shootout/run.sh from root, paths work.
# If run as ./run.sh from directory, we need to adjust.

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Navigate to repo root to run commands
cd "$REPO_ROOT"

echo "Running Cross-Subsystem Benchmarks..."
echo "Lang,Benchmark,AvgTime(ms)" > "$SCRIPT_DIR/results.csv"

# TS
if command -v npm >/dev/null 2>&1; then
    # Use npx -y tsx to ensure it installs if needed and runs
    npx -y tsx benchmarks/shootout/ts/index.ts >> "$SCRIPT_DIR/results.csv"
else
    echo "npm not found, skipping TS"
fi

# Python
if command -v python3 >/dev/null 2>&1; then
    python3 benchmarks/shootout/python/main.py >> "$SCRIPT_DIR/results.csv"
elif command -v python >/dev/null 2>&1; then
    python benchmarks/shootout/python/main.py >> "$SCRIPT_DIR/results.csv"
else
    echo "python not found, skipping Python"
fi

# Go
if command -v go >/dev/null 2>&1; then
    # We must be in the module directory or handle go run properly
    # Using 'go run main.go' inside the directory is safest
    (cd benchmarks/shootout/go && go run main.go) >> "$SCRIPT_DIR/results.csv"
else
    echo "go not found, skipping Go"
fi

echo "Done. Results:"
cat "$SCRIPT_DIR/results.csv"

# Convert to JSON roughly
echo "[" > "$SCRIPT_DIR/results.json"
first=true
while IFS=, read -r lang benchmark time; do
    # Trim whitespace
    lang=$(echo "$lang" | xargs)
    benchmark=$(echo "$benchmark" | xargs)
    time=$(echo "$time" | xargs)

    if [ "$lang" == "Lang" ]; then continue; fi
    if [ -z "$lang" ]; then continue; fi

    if [ "$first" = true ]; then
        first=false
    else
        echo "," >> "$SCRIPT_DIR/results.json"
    fi
    echo "  {\"lang\": \"$lang\", \"benchmark\": \"$benchmark\", \"time_ms\": $time}" >> "$SCRIPT_DIR/results.json"
done < "$SCRIPT_DIR/results.csv"
echo "]" >> "$SCRIPT_DIR/results.json"

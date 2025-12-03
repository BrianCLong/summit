# Reproducible Build Verifier

This tool verifies if a build process is deterministic by running it twice and comparing the outputs.

## Usage

```bash
python3 tools/determinism/repro_verifier.py \
  --build-command "npm run build" \
  --output-dir "dist" \
  --clean-command "npm run clean"
```

## Arguments

- `--build-command`: The command used to build the project (required).
- `--output-dir`: The directory containing the build artifacts (required).
- `--clean-command`: A command to clean the workspace before each build (optional).
- `--work-dir`: The working directory to run commands in (default: current directory).

## Output

The tool will output:
- Whether the builds are identical.
- A list of differing files.
- Unified diffs for text files that differ.
- Exit code 0 if deterministic, 1 if differences found.

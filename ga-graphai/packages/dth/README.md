# Deterministic Toolchain Hasher (DTH)

`dth` computes stable identities for build and execution pipelines by fingerprinting the
full toolchain (compilers, libraries, kernels, drivers) and the execution graph that
uses them. The resulting pipeline IDs can be handed to cache registries such as
DPEC and SPAR to guarantee deterministic cache hits across environments.

## Installation

```bash
npm install
```

This package is managed via the `ga-graphai` workspace. Run `npm install` from the
repository root to link workspace dependencies.

## Usage

```bash
npx dth hash path/to/pipeline.manifest.yaml
```

### Commands

#### `dth hash <manifest>`

Computes a deterministic pipeline ID from the supplied manifest. Options:

- `-a, --algorithm <algo>` — Hash algorithm (default `sha256`).
- `-o, --output <file>` — Write the pipeline ID to a file instead of STDOUT.
- `-r, --receipt <file>` — Emit a full pipeline receipt JSON to the given file.
- `--pretty` — Pretty-print the receipt JSON output.

#### `dth receipt <manifest>`

Generates a structured receipt that includes the pipeline ID, component digests, and
source manifest metadata. Options:

- `-a, --algorithm <algo>` — Hash algorithm (default `sha256`).
- `-o, --output <file>` — Where to write the receipt (defaults to STDOUT).
- `--pretty` — Pretty-print the JSON output.

#### `dth diff <left-receipt> <right-receipt>`

Produces a human-readable explanation of the changes between two receipts.
Options:

- `-o, --output <file>` — Write the diff report to a file.
- `--json` — Emit a machine-readable diff JSON instead of text.
- `--fail-on-change` — Exit with status code `1` when differences are detected.

## Manifest format

The manifest describes the toolchain and execution graph. Supported formats are
JSON, YAML, and TOML. A minimal example:

```yaml
name: example pipeline
version: 1.0.0
toolchain:
  compilers:
    - name: gcc
      version: "12.2"
      path: /usr/bin/gcc
  libraries:
    - name: glibc
      version: "2.35"
executionGraph:
  nodes:
    - id: preprocess
      type: container
      image: alpine:3.19
      command: ./scripts/preprocess.sh
  edges:
    - from: preprocess
      to: train
      artifact: preprocessed-data
metadata:
  owner: ml-team
```

The CLI normalizes component ordering before hashing so manifests that describe the
same toolchain yield identical IDs.

## Receipts and registries

Receipts embed per-component digests along with a canonical manifest hash. Caches
and registries such as DPEC/SPAR can use these values to validate hits or explain
mismatches via the diff command. The diff output highlights only altered
components so you can quickly answer “why did this change?”.

## Testing

```bash
npm test
```

The test suite relies on Node's built-in test runner to keep the toolchain light.

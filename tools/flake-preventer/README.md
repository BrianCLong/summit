# Predictive CI Flake Preventer

This tool suite provides mechanisms to detect and prevent flaky tests by running them under stress and analyzing failure patterns.

## Components

### 1. Chaos Generator (`chaos.ts`)
A library to generate random, malformed, or chaotic inputs for your tests.

**Usage:**
```typescript
import { ChaosGenerator } from '../tools/flake-preventer/chaos'; // Adjust path
const chaos = new ChaosGenerator(0.2);
const badInput = chaos.malformInput({ name: "User", age: 30 });
```

### 2. Load Runner (`runner.ts`)
Runs your test command while injecting CPU, IO, or Network load.

**Usage:**
```bash
# Run tests with CPU and IO load
npx ts-node tools/flake-preventer/runner.ts --cpu --io -- npm test
```

Arguments:
- `--cpu`: Spawns CPU-intensive workers.
- `--io`: Spawns IO-intensive workers (disk churn).
- `--net`: Spawns network-intensive workers (localhost traffic).
- `--all`: Enables all stress modes.

### 3. Analyzer (`analyzer.ts`)
Parses Jest JSON output to classify failures based on known flake signatures.

**Usage:**
```bash
npx ts-node tools/flake-preventer/analyzer.ts test-results.json
```

### 4. Gate (`gate.ts`)
Checks the analysis report and fails if the risk score is too high.

**Usage:**
```bash
npx ts-node tools/flake-preventer/gate.ts [threshold]
```

## Integration Example

To run a flake guard check:

```bash
# 1. Run tests under load and save JSON output (ignore failure code to allow analysis)
npx ts-node tools/flake-preventer/runner.ts --cpu -- npm test -- --json --outputFile=results.json || true

# 2. Analyze
npx ts-node tools/flake-preventer/analyzer.ts results.json

# 3. Gate
npx ts-node tools/flake-preventer/gate.ts 20
```

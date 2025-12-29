# Replay Simulator Tool

The `replay-receipt.ts` tool simulates the behavior of a connector sending the same receipt payload multiple times to a destination. Its primary purpose is to verify that the destination system handles idempotency correctly (i.e., accepts the first request and correctly identifies subsequent requests as duplicates).

## Usage

Run the tool using `npx tsx` (or `ts-node` if available).

```bash
npx tsx tools/replay-receipt.ts --times <N> --seed <SEED>
```

### Arguments

-   `--times`, `-t`: Number of times to replay the payload (default: 1).
-   `--seed`, `-s`: Seed string for deterministic payload generation (default: "default-seed").

### Example

Simulate replaying a receipt 5 times:

```bash
npx tsx tools/replay-receipt.ts --times 5 --seed my-test-seed
```

### Output

The tool outputs a JSON report summary:

```json
{
  "totalAttempts": 5,
  "success": 1,
  "duplicates": 4,
  "errors": 0,
  "seed": "my-test-seed",
  "payloadId": "receipt-..."
}
```

## Integration

To use this tool with a real service, you can import the `ReplaySimulator` class and provide a `submitFn` that calls your service endpoint.

```typescript
import { ReplaySimulator } from './tools/replay-receipt';

const mySubmitter = async (payload) => {
    // Call your API or Service here
    // Return { status: 'success' | 'duplicate' | 'error' }
};

const simulator = new ReplaySimulator(mySubmitter);
const report = await simulator.run(5, 'some-seed');
```

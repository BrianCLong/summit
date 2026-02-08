import { spawn } from 'node:child_process';

const sampleInput = JSON.stringify({
  timestamp: "2026-02-07T05:55:21Z",
  nextlsn: "0/16B4F20",
  change: [
    {
      schema: "public",
      table: "orders",
      kind: "insert", // testing 'kind' instead of 'op'
      columnnames: ["id", "amount", "status"],
      columnvalues: [123, 99.99, "pending"]
    }
  ]
});

async function runTest() {
  console.log("Starting CDC projection final verification test...");

  const consumer = spawn('node', ['src/canonical_consumer.js'], {
    cwd: './streaming/cdc-projection',
    env: {
      ...process.env,
      SOURCE_COMMIT: 'final-commit-sha',
      PROJECTION_NAME: 'final-projection',
      SCHEMA_VERSION: '1'
    }
  });

  let output = '';
  consumer.stdout.on('data', (data) => {
    output += data.toString();
  });

  consumer.stderr.on('data', (data) => {
    console.error(`Consumer Error: ${data}`);
  });

  consumer.stdin.write(sampleInput + '\n');
  consumer.stdin.end();

  await new Promise((resolve) => consumer.on('close', resolve));

  console.log("Consumer Output:");
  console.log(output);

  if (output.includes('Applying c for pg://localhost/db/public.orders/PK:123')) {
    console.log("✅ Verification Successful: Event processed correctly with 'kind: insert' -> 'c'.");
  } else {
    console.log("❌ Verification Failed: Expected output (Applying c ...) not found.");
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});

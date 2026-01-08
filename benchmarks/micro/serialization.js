const fs = require("fs");
const path = require("path");

const fixturePath = path.join(__dirname, "../fixtures/small.json");
const data = fs.readFileSync(fixturePath, "utf8");
const obj = JSON.parse(data);

console.log("Running Serialization Benchmark...");

const iterations = 100000;
const start = process.hrtime.bigint();

for (let i = 0; i < iterations; i++) {
  JSON.stringify(obj);
}

const end = process.hrtime.bigint();
const duration = Number(end - start) / 1e6; // ms

console.log(`JSON.stringify ${iterations} iterations: ${duration.toFixed(2)}ms`);
console.log(`Average: ${(duration / iterations).toFixed(4)}ms/op`);

if (duration > 5000) {
  console.error("Performance Budget Exceeded! Limit: 5000ms");
  process.exit(1);
}

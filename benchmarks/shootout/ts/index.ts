import { performance } from 'perf_hooks';

const RUNS = 5;

function fib(n: number): number {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

function jsonTest() {
  const data = [];
  for (let i = 0; i < 1000; i++) {
    data.push({
      id: i,
      name: `Item ${i}`,
      description: "Some description text that is relatively long to test string handling in JSON parsing.",
      values: [i, i * 2, i * 3],
      active: i % 2 === 0
    });
  }
  const jsonStr = JSON.stringify(data);
  let parsed;
  for (let i = 0; i < 100; i++) {
    parsed = JSON.parse(jsonStr);
  }
  return parsed.length;
}

function stringConcatTest() {
  let s = "";
  for (let i = 0; i < 50000; i++) {
    s += i.toString();
  }
  return s.length;
}

function benchmark(name: string, fn: () => any) {
  let total = 0;
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    total += (end - start);
  }
  const avg = total / RUNS;
  console.log(`TS,${name},${avg.toFixed(4)}`);
}

function main() {
    // Warmup
    fib(20);
    jsonTest();
    stringConcatTest();

    benchmark("Fibonacci(30)", () => fib(30));
    benchmark("JSON Parse", jsonTest);
    benchmark("String Concat", stringConcatTest);
}

main();

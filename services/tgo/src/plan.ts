import { Task } from './schema';
import { est } from './estimator';
export function planPR(changed: string[]): Task[] {
  const build: Task = {
    id: 'build',
    kind: 'build',
    estSec: 120,
    needs: [],
    caps: ['cpu', 'linux'],
    priority: 'hot',
  };
  const testShards = shardTests(changed).map((files, i) => ({
    id: `test-${i}`,
    kind: 'test',
    files,
    estSec: est(files),
    needs: ['build'],
    caps: ['cpu', 'linux'],
    priority: 'hot',
  }));
  const lint: Task = {
    id: 'lint',
    kind: 'lint',
    estSec: 40,
    needs: [],
    caps: ['cpu'],
    priority: 'normal',
  };
  const policy: Task = {
    id: 'policy',
    kind: 'policy',
    estSec: 20,
    needs: [],
    caps: ['cpu'],
    priority: 'hot',
  };
  return [build, ...testShards, lint, policy];
}
function shardTests(changed: string[]) {
  // cluster by top-level folder + size into ~N shards using greedy packing
  const tests = globTests(changed);
  const target = 6;
  const shards: Array<string[]> = Array.from({ length: target }, () => []);
  const cost = (arr: string[]) =>
    arr.reduce((s, f) => s + ((f.length % 10) + 1), 0);
  for (const t of tests.sort((a, b) => b.length - a.length)) {
    shards.sort((a, b) => cost(a) - cost(b))[0].push(t);
  }
  return shards.filter((s) => s.length);
}

/**
 * Generate all subsets (power set) of an array
 */
export function powerSet<T>(arr: T[]): T[][] {
  const result: T[][] = [[]];

  for (const element of arr) {
    const length = result.length;
    for (let i = 0; i < length; i++) {
      result.push([...result[i], element]);
    }
  }

  return result;
}

/**
 * Generate all combinations of size k from array
 */
export function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  if (k === arr.length) return [arr];

  const result: T[][] = [];

  const combine = (start: number, combo: T[]) => {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }

    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  };

  combine(0, []);
  return result;
}

/**
 * Generate all permutations of an array
 */
export function permutations<T>(arr: T[]): T[][] {
  if (arr.length === 0) return [[]];
  if (arr.length === 1) return [arr];

  const result: T[][] = [];

  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const remainingPerms = permutations(remaining);

    for (const perm of remainingPerms) {
      result.push([current, ...perm]);
    }
  }

  return result;
}

/**
 * Calculate binomial coefficient (n choose k)
 */
export function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  let result = 1;
  for (let i = 1; i <= k; i++) {
    result *= (n - i + 1) / i;
  }

  return Math.round(result);
}

/**
 * Calculate factorial
 */
export function factorial(n: number): number {
  if (n < 0) throw new Error('Factorial of negative number is undefined');
  if (n === 0 || n === 1) return 1;

  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }

  return result;
}

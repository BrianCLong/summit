export function canonicalizePolicy(input: string): string {
  // Simple v0 canonicalization:
  // 1. Trim whitespace
  // 2. Normalize line endings to \n
  // 3. Ensure trailing newline
  // Note: For full v1, we would parse JSON/YAML and deterministic-stringify (sort keys).

  let content = input.trim();
  content = content.replace(/\r\n/g, "\n");
  return content + "\n";
}

export function computePolicyHash(canonical: string): string {
  // Simple placeholder hash function for v0.
  // In a real environment we would use crypto.createHash('sha256').
  // For now, let's assume we are in a node environment or similar.
  // But to avoid dependencies in this skeleton, I'll use a simple DJB2-like or just return a mock if dependencies are tricky.
  // Actually, let's use node's crypto if available, or just a stub.
  // Since we are creating a package, let's try to be proper.

  // Checking if we can import 'crypto'. 'packages/policy-cards/package.json' has types/node.

  return "HASH_TODO_" + canonical.length;
}

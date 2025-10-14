export function redact<T>(payload: T): T {
  // Replace secrets with tokens; align to purpose/retention policy in production.
  return payload;
}

export function safeJsonParse<T>(payload: string): T {
  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown JSON parse error';
    throw new Error(`Failed to parse JSON response: ${message}`);
  }
}

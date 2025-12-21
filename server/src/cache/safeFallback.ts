export type FallbackOptions<T> = {
  timeoutMs: number;
  primary: () => Promise<T>;
  fallback: () => Promise<T> | T;
  onError?: (err: unknown) => void;
};

export async function withSafeFallback<T>(options: FallbackOptions<T>): Promise<T> {
  const { timeoutMs, primary, fallback, onError } = options;
  let timeoutHandle: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });

  try {
    const result = await Promise.race([primary(), timeoutPromise]);
    if (timeoutHandle) clearTimeout(timeoutHandle);
    return result as T;
  } catch (err) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    onError?.(err);
    return await fallback();
  }
}

export interface SlowKiller<T> {
  guard(promise: Promise<T>): Promise<T>;
  clear(): void;
}

export function createSlowKiller<T>(timeoutMs: number, onKill: () => void): SlowKiller<T> {
  let timeoutHandle: NodeJS.Timeout | null = null;

  const guard = (promise: Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      timeoutHandle = setTimeout(() => {
        onKill();
        reject(new Error('terminated')); // ensures race resolves
      }, timeoutMs);

      promise
        .then((value) => {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          resolve(value);
        })
        .catch((err) => {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          reject(err);
        });
    });
  };

  const clear = (): void => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
  };

  return { guard, clear };
}

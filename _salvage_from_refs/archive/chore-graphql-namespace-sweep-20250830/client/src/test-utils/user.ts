import userEvent from "@testing-library/user-event";

export async function withUser<T>(fn: (u: ReturnType<typeof userEvent.setup>) => Promise<T> | T) {
  const usingFake = (jest as any).isMockFunction?.(setTimeout) && typeof jest.getRealSystemTime === "function";
  if (usingFake) {
    // Force real timers for userEvent-driven tests
    jest.useRealTimers();
  }
  const u = userEvent.setup();
  return await fn(u);
}

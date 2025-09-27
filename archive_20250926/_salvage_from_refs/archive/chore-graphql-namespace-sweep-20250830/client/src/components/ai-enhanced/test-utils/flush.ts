import { act } from "@testing-library/react";

export async function flushMicrotasks() {
  await act(async () => { await Promise.resolve(); });
}

export async function flushAllTimersAndMicrotasks() {
  await act(async () => {
    if (jest.getTimerCount?.() > 0 && "runOnlyPendingTimersAsync" in jest) {
      // @ts-ignore
      await jest.runOnlyPendingTimersAsync();
    }
    await Promise.resolve();
  });
}
import userEvent from '@testing-library/user-event';

export async function withUser(fn: (u: ReturnType<typeof userEvent.setup>) => Promise<void> | void) {
  const u = userEvent.setup();
  await fn(u as any);
}


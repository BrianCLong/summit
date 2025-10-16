import { screen, waitFor } from '@testing-library/react';

export async function waitForIdle(timeout = 2000) {
  await waitFor(
    () => {
      const statusEl = screen.getByRole('status', {
        name: /assistant-status/i,
      });
      const text = statusEl.textContent || '';
      if (!text.match(/online/i)) {
        throw new Error(`Expected status to be idle/online, got: "${text}"`);
      }
    },
    { timeout },
  );
}

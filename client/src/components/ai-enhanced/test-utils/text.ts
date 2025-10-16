import { waitFor } from '@testing-library/react';

export function normalizeText(s: string): string {
  return s
    .replace(/\u00A0/g, ' ') // nbsp
    .replace(/\u200B/g, '') // zero width space
    .replace(/\r\n|\r|\n/g, ' ') // newlines → spaces
    .replace(/\s+/g, ' ') // collapse
    .trim();
}

/** Wait until container's aggregate textContent matches pattern. */
export async function expectTextAcrossElements(
  container: HTMLElement,
  pattern: RegExp | string,
  timeout = 2000,
) {
  if (!container) {
    throw new Error('Container element is null or undefined');
  }

  const isMatch =
    typeof pattern === 'string'
      ? (s: string) => normalizeText(s).includes(normalizeText(pattern))
      : (s: string) => pattern.test(normalizeText(s));

  await waitFor(
    () => {
      const text = normalizeText(container.textContent || '');
      if (!isMatch(text)) {
        throw new Error(`Expected text to match pattern. Got: "${text}"`);
      }
    },
    { timeout },
  );
}

export async function expectLastAssistantMessageToContain(
  pattern: RegExp | string,
  timeout = 2000,
) {
  await waitFor(
    () => {
      const log = document.querySelector(
        '[data-testid="message-log"]',
      ) as HTMLElement;
      if (!log) throw new Error('message-log not found');
      const articles = Array.from(
        log.querySelectorAll('article[aria-label="assistant"]'),
      );
      if (articles.length === 0) throw new Error('No assistant messages found');
      const last = articles[articles.length - 1] as HTMLElement;
      if (!last) throw new Error('Last assistant message is null');

      const isMatch =
        typeof pattern === 'string'
          ? (s: string) => normalizeText(s).includes(normalizeText(pattern))
          : (s: string) => pattern.test(normalizeText(s));

      const text = normalizeText(last.textContent || '');
      if (!isMatch(text)) {
        throw new Error(
          `Expected last assistant message to match pattern. Got: "${text}"`,
        );
      }
    },
    { timeout },
  );
}

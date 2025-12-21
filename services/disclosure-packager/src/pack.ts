import { escapeHtml } from './sanitize';

export function renderDisclosure(id: string, content: string) {
  return `<article data-id="${escapeHtml(id)}">${escapeHtml(content)}</article>`;
}

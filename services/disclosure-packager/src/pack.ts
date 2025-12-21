import { escapeHtml } from './sanitize';

export function buildDisclosure(caseId: string, content: string){
  const safeId = escapeHtml(caseId);
  const safeContent = escapeHtml(content);
  return `<article data-case="${safeId}"><pre>${safeContent}</pre></article>`;
}

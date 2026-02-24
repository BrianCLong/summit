import { SupportSpan } from '../schema/evidence_v1';

export function findSupportSpan(docText: string, searchStr: string, docId: string): SupportSpan | null {
  const index = docText.indexOf(searchStr);
  if (index === -1) return null;

  return {
    doc_id: docId,
    start: index,
    end: index + searchStr.length,
    text: searchStr
  };
}

export function validateSupportSpan(span: SupportSpan, docText: string): boolean {
  return docText.substring(span.start, span.end) === span.text;
}

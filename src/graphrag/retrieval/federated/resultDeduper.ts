import { FederatedHit } from "../../adapters/types";

export class ResultDeduper {
  dedupe(hits: FederatedHit[]): FederatedHit[] {
    const docMap = new Map<string, FederatedHit>();

    for (const hit of hits) {
      const existing = docMap.get(hit.docId);
      if (existing) {
        if (hit.score > existing.score) {
          docMap.set(hit.docId, hit);
        }
      } else {
        docMap.set(hit.docId, hit);
      }
    }

    return Array.from(docMap.values());
  }
}

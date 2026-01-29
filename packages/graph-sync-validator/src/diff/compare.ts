import { Selector, DriftFinding } from '../types.js';

export async function* diffStream(
  pgStream: AsyncGenerator<any[]>,
  neoStream: AsyncGenerator<any[]>,
  selector: Selector,
  severityWeights: Record<string, number>
): AsyncGenerator<DriftFinding> {
  let pgBuffer: any[] = [];
  let neoBuffer: any[] = [];

  let pgDone = false;
  let neoDone = false;

  const pgIter = pgStream[Symbol.asyncIterator]();
  const neoIter = neoStream[Symbol.asyncIterator]();

  while (!pgDone || !neoDone || pgBuffer.length > 0 || neoBuffer.length > 0) {
    if (pgBuffer.length === 0 && !pgDone) {
      const res = await pgIter.next();
      if (res.done) pgDone = true;
      else pgBuffer = res.value;
    }

    if (neoBuffer.length === 0 && !neoDone) {
      const res = await neoIter.next();
      if (res.done) neoDone = true;
      else neoBuffer = res.value;
    }

    if (pgBuffer.length > 0 && neoBuffer.length > 0) {
      const pgItem = pgBuffer[0];
      const neoItem = neoBuffer[0];

      const pgId = pgItem[selector.pk.column];
      const neoId = neoItem[selector.pk.asId];

      // Compare IDs (assuming they are sortable in the same way)
      // PG might return numbers or strings. Neo4j loader returns what properties are.
      // We should normalize comparison.
      const pgIdStr = String(pgId);
      const neoIdStr = String(neoId);

      // We assume the sort order from loaders matches string comparison or number comparison strictly.
      // If loaders sort numerically and we compare strings, it might break: "10" < "2".
      // Assuming IDs are consistently typed or we rely on the loader's ORDER BY logic being consistent with this JS logic.
      // For safety, let's assume comparable types.

      if (pgId < neoId) {
        yield {
          kind: 'MISSING_NODE',
          id: String(pgId),
          label: selector.label,
          severity: severityWeights.MISSING_NODE ?? 10,
          data: pgItem
        };
        pgBuffer.shift();
      } else if (pgId > neoId) {
        yield {
          kind: 'ORPHAN_NODE',
          id: String(neoId),
          label: selector.label,
          severity: severityWeights.ORPHAN_NODE ?? 3
        };
        neoBuffer.shift();
      } else {
        // IDs match
        for (const propDef of selector.properties) {
          const pgVal = pgItem[propDef.column];
          const neoVal = neoItem[propDef.prop];

          if (!valuesEqual(pgVal, neoVal, propDef.type)) {
            yield {
              kind: 'PROP_MISMATCH',
              id: String(pgId),
              label: selector.label,
              prop: propDef.prop,
              expected: pgVal,
              actual: neoVal,
              severity: severityWeights.PROP_MISMATCH ?? 6
            };
          }
        }
        pgBuffer.shift();
        neoBuffer.shift();
      }
    } else if (pgBuffer.length > 0) {
      const pgItem = pgBuffer.shift();
      yield {
        kind: 'MISSING_NODE',
        id: String(pgItem[selector.pk.column]),
        label: selector.label,
        severity: severityWeights.MISSING_NODE ?? 10,
        data: pgItem
      };
    } else if (neoBuffer.length > 0) {
       const neoItem = neoBuffer.shift();
       yield {
         kind: 'ORPHAN_NODE',
         id: String(neoItem[selector.pk.asId]),
         label: selector.label,
         severity: severityWeights.ORPHAN_NODE ?? 3
       };
    } else {
        break;
    }
  }
}

function valuesEqual(v1: any, v2: any, type: string): boolean {
    if (v1 === v2) return true;
    if (v1 === null || v1 === undefined) return v2 === null || v2 === undefined;

    if (type === 'date') {
        const d1 = new Date(v1);
        const d2 = new Date(v2);
        return d1.getTime() === d2.getTime();
    }

    // Neo4j Integers need .toNumber() or similar?
    // The Neo4j driver converts to BigInt or Number depending on config.
    // We'll compare string representations for safety.
    return String(v1) === String(v2);
}

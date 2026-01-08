// @ts-nocheck
import {
  Receipt,
  ReceiptExportBundle,
  RedactionRule,
  applyRedactions,
} from "@intelgraph/provenance";
import tar from "tar-stream";
import { createGzip } from "zlib";
import { ProvenanceChain } from "../ledger";

export interface ReceiptBundleOptions {
  receipts: Receipt[];
  redactions?: RedactionRule[];
  includeProvenance?: boolean;
  provenanceFetcher?: (id: string) => ProvenanceChain | null;
}

export function assembleReceiptBundle({
  receipts,
  redactions = [],
  includeProvenance,
  provenanceFetcher,
}: ReceiptBundleOptions) {
  const pack = tar.pack();

  const bundle: ReceiptExportBundle = {
    receipts: [],
    redactions,
  };

  for (const receipt of receipts) {
    const sanitized = applyRedactions(receipt, [...(receipt.redactions ?? []), ...redactions]);

    pack.entry({ name: `receipts/full/${receipt.id}.json` }, JSON.stringify(receipt, null, 2));
    pack.entry(
      { name: `receipts/redacted/${receipt.id}.json` },
      JSON.stringify(sanitized, null, 2)
    );

    bundle.receipts.push(sanitized);

    if (includeProvenance && provenanceFetcher) {
      const prov = provenanceFetcher(receipt.claimIds[0]);
      if (prov) {
        pack.entry(
          { name: `provenance/${receipt.claimIds[0]}.json` },
          JSON.stringify(prov, null, 2)
        );
      }
    }
  }

  pack.entry({ name: "bundle.json" }, JSON.stringify(bundle, null, 2));
  pack.finalize();

  return pack.pipe(createGzip());
}

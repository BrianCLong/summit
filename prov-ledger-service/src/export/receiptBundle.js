"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assembleReceiptBundle = assembleReceiptBundle;
// @ts-nocheck
const provenance_1 = require("@intelgraph/provenance");
const tar_stream_1 = __importDefault(require("tar-stream"));
const zlib_1 = require("zlib");
function assembleReceiptBundle({ receipts, redactions = [], includeProvenance, provenanceFetcher, }) {
    const pack = tar_stream_1.default.pack();
    const bundle = {
        receipts: [],
        redactions,
    };
    for (const receipt of receipts) {
        const sanitized = (0, provenance_1.applyRedactions)(receipt, [...(receipt.redactions ?? []), ...redactions]);
        pack.entry({ name: `receipts/full/${receipt.id}.json` }, JSON.stringify(receipt, null, 2));
        pack.entry({ name: `receipts/redacted/${receipt.id}.json` }, JSON.stringify(sanitized, null, 2));
        bundle.receipts.push(sanitized);
        if (includeProvenance && provenanceFetcher) {
            const prov = provenanceFetcher(receipt.claimIds[0]);
            if (prov) {
                pack.entry({ name: `provenance/${receipt.claimIds[0]}.json` }, JSON.stringify(prov, null, 2));
            }
        }
    }
    pack.entry({ name: 'bundle.json' }, JSON.stringify(bundle, null, 2));
    pack.finalize();
    return pack.pipe((0, zlib_1.createGzip)());
}

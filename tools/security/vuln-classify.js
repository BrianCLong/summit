"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.classify = classify;
const node_fs_1 = __importDefault(require("node:fs"));
const RULES = [
    { match: f => (f.tool === "zap" && /xss/i.test(f.title)), vulnClass: "ZAP-XSS-REFLECTED", confidence: 0.8 },
    // ...
];
function classify(findings) {
    return findings.map(f => {
        const hit = RULES.find(r => r.match(f));
        return { ...f, vulnClass: hit?.vulnClass ?? "UNCLASSIFIED", confidence: hit?.confidence ?? 0.1 };
    });
}
if (require.main === module) {
    const input = JSON.parse(node_fs_1.default.readFileSync(process.argv[2], "utf8"));
    const out = classify(input);
    process.stdout.write(JSON.stringify(out, null, 2));
}

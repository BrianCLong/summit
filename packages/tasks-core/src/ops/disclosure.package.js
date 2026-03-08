"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const maestro_sdk_1 = require("@intelgraph/maestro-sdk");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const archiver_1 = __importDefault(require("archiver"));
const hash_js_1 = require("../util/hash.js");
function applyRedactions(content, rules, recipient, sourcePath) {
    const applied = [];
    let current = content.toString('utf8');
    for (const rule of rules) {
        if (rule.appliesTo && !rule.appliesTo.includes(recipient)) {
            continue;
        }
        if (rule.paths && !rule.paths.includes(sourcePath)) {
            continue;
        }
        const before = current;
        current = current.replace(new RegExp(rule.pattern, 'g'), rule.replacement);
        if (before !== current) {
            applied.push(rule.id);
        }
    }
    return { content: Buffer.from(current, 'utf8'), applied };
}
exports.default = (0, maestro_sdk_1.defineTask)({
    async execute(_ctx, { payload }) {
        const redactions = payload.redactions ?? [];
        const filesManifest = payload.evidence.map((file) => ({
            path: file.path,
            sha256: (0, hash_js_1.sha256)(node_fs_1.default.readFileSync(file.path)),
            classification: file.classification,
            recipients: file.recipients ?? payload.recipients,
            description: file.description,
        }));
        const manifest = {
            generatedAt: new Date().toISOString(),
            classification: payload.classification,
            banner: payload.banner,
            recipients: payload.recipients,
            files: filesManifest,
            redactionRules: redactions.map((rule) => ({
                id: rule.id,
                replacement: rule.replacement,
                description: rule.description,
                appliesTo: rule.appliesTo,
                paths: rule.paths,
            })),
            views: [],
        };
        const out = node_fs_1.default.createWriteStream(payload.outPath);
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        archive.pipe(out);
        for (const recipient of payload.recipients) {
            const viewFiles = [];
            for (const file of payload.evidence) {
                const allowedRecipients = file.recipients ?? payload.recipients;
                if (!allowedRecipients.includes(recipient)) {
                    continue;
                }
                const rawContent = node_fs_1.default.readFileSync(file.path);
                const { content, applied } = applyRedactions(rawContent, redactions, recipient, file.path);
                const packagedAs = node_path_1.default.posix.join('views', recipient, node_path_1.default.basename(file.path));
                archive.append(content, { name: packagedAs });
                viewFiles.push({
                    originalPath: file.path,
                    packagedAs,
                    sha256: (0, hash_js_1.sha256)(content),
                    classification: file.classification,
                    appliedRedactions: applied,
                    recipients: allowedRecipients,
                    description: file.description,
                });
            }
            manifest.views.push({
                recipient,
                files: viewFiles,
                appliedRedactions: Array.from(new Set(viewFiles.flatMap((f) => f.appliedRedactions))),
            });
        }
        archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
        await archive.finalize();
        return { payload: { bundle: payload.outPath, manifest } };
    },
});

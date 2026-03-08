"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const disclosure_package_js_1 = __importDefault(require("../src/ops/disclosure.package.js"));
const hash_js_1 = require("../src/util/hash.js");
test('packages redacted recipient-specific disclosure views with manifest', async () => {
    const caseFile = node_path_1.default.join(process.cwd(), 'tmp-case.txt');
    const legalFile = node_path_1.default.join(process.cwd(), 'tmp-legal.txt');
    node_fs_1.default.writeFileSync(caseFile, 'Case 12345 belongs to Alice.');
    node_fs_1.default.writeFileSync(legalFile, 'Legal memo for internal review.');
    const res = await disclosure_package_js_1.default.execute({}, {
        payload: {
            evidence: [
                {
                    path: caseFile,
                    classification: { level: 'CONFIDENTIAL', caveats: ['PII'] },
                    recipients: ['analyst', 'legal'],
                },
                {
                    path: legalFile,
                    classification: { level: 'OFFICIAL' },
                    recipients: ['legal'],
                },
            ],
            classification: { level: 'CUI', caveats: ['SP-HOUSE'] },
            recipients: ['analyst', 'legal'],
            redactions: [
                { id: 'mask-ids', pattern: '\\d{5}', replacement: '[REDACTED]', appliesTo: ['analyst'] },
                { id: 'mask-names', pattern: 'Alice', replacement: '[NAME]', appliesTo: ['analyst'] },
            ],
            outPath: node_path_1.default.join(process.cwd(), 'bundle.zip'),
            banner: 'Disclosure: Sensitive evidence bundle',
        },
    });
    const manifest = res.payload.manifest;
    expect(res.payload.bundle.endsWith('bundle.zip')).toBe(true);
    expect(manifest.classification.level).toBe('CUI');
    expect(manifest.redactionRules).toHaveLength(2);
    expect(manifest.views).toHaveLength(2);
    const analystView = manifest.views.find((view) => view.recipient === 'analyst');
    const legalView = manifest.views.find((view) => view.recipient === 'legal');
    expect(analystView?.files).toHaveLength(1);
    expect(analystView?.files[0].appliedRedactions).toEqual(['mask-ids', 'mask-names']);
    expect(analystView?.files[0].sha256).toBe((0, hash_js_1.sha256)('Case [REDACTED] belongs to [NAME].'));
    expect(legalView?.files).toHaveLength(2);
    expect(legalView?.files[0].appliedRedactions).toEqual([]);
    expect(legalView?.files[0].sha256).toBe((0, hash_js_1.sha256)('Case 12345 belongs to Alice.'));
    expect(legalView?.files[1].sha256).toBe((0, hash_js_1.sha256)('Legal memo for internal review.'));
    node_fs_1.default.unlinkSync(caseFile);
    node_fs_1.default.unlinkSync(legalFile);
    node_fs_1.default.unlinkSync(res.payload.bundle);
});

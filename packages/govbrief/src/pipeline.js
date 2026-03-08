"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFetch = runFetch;
exports.runBrief = runBrief;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const fetcher_js_1 = require("./fetcher.js");
const pcs_js_1 = require("./pcs.js");
const claims_js_1 = require("./claims.js");
const normalize_js_1 = require("./normalize.js");
const safety_js_1 = require("./safety.js");
const utils_js_1 = require("./utils.js");
async function readPackageVersion() {
    const packagePath = new URL('../package.json', import.meta.url);
    const contents = await promises_1.default.readFile(packagePath);
    const data = JSON.parse(contents.toString());
    return data.version ?? '0.0.0';
}
function buildArtifactDir(hash, baseDir = 'artifacts') {
    return node_path_1.default.join(baseDir, hash);
}
async function runFetch(url, baseDir = 'artifacts') {
    const fetchResult = await (0, fetcher_js_1.fetchWithWayback)(url);
    const hash = (0, utils_js_1.computeSha256)(fetchResult.html);
    const artifactDir = buildArtifactDir(hash, baseDir);
    await (0, fetcher_js_1.writeFile)(artifactDir, 'raw.html', fetchResult.html);
    const article = (0, normalize_js_1.extractArticleRecord)(fetchResult.html, fetchResult.usedUrl, fetchResult.archiveUrl);
    const cleanText = article.sections
        .map((section) => section.text)
        .join('\n\n');
    await (0, fetcher_js_1.writeFile)(artifactDir, 'clean.txt', cleanText);
    const claims = (0, claims_js_1.generateClaims)(article, hash);
    const safety = (0, safety_js_1.reviewSafety)(claims);
    const version = await readPackageVersion();
    const provenance = {
        retrievedAt: fetchResult.retrievedAt,
        sourceUrl: fetchResult.usedUrl,
        archiveUrl: fetchResult.archiveUrl,
        sha256: hash,
        toolVersions: {
            govbrief: version,
        },
    };
    await (0, fetcher_js_1.writeFile)(artifactDir, 'article.json', JSON.stringify(article, null, 2));
    await (0, fetcher_js_1.writeFile)(artifactDir, 'claims.json', JSON.stringify(claims, null, 2));
    await (0, fetcher_js_1.writeFile)(artifactDir, 'provenance.json', JSON.stringify(provenance, null, 2));
    await (0, fetcher_js_1.writeFile)(artifactDir, 'safety.json', JSON.stringify(safety, null, 2));
    return {
        article,
        claims,
        provenance,
        safety,
        artifactDir,
    };
}
async function runBrief(artifactDir) {
    const [articleRaw, claimsRaw, provenanceRaw, safetyRaw] = await Promise.all([
        promises_1.default.readFile(node_path_1.default.join(artifactDir, 'article.json'), 'utf8'),
        promises_1.default.readFile(node_path_1.default.join(artifactDir, 'claims.json'), 'utf8'),
        promises_1.default.readFile(node_path_1.default.join(artifactDir, 'provenance.json'), 'utf8'),
        promises_1.default.readFile(node_path_1.default.join(artifactDir, 'safety.json'), 'utf8'),
    ]);
    const article = JSON.parse(articleRaw);
    const claims = JSON.parse(claimsRaw);
    const provenance = JSON.parse(provenanceRaw);
    const safety = JSON.parse(safetyRaw);
    if (safety.flags.some((flag) => flag.severity === 'high')) {
        throw new Error('Brief generation blocked: high-severity safety flags present.');
    }
    const brief = (0, pcs_js_1.composeBrief)(article, claims, provenance, safety);
    await (0, fetcher_js_1.writeFile)(artifactDir, 'brief.md', brief);
    return brief;
}

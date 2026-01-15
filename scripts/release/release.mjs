#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compareTags } from './semver-tags.mjs';
const REQUIRED_NOTES_SECTIONS = [
    'Highlights',
    'Detailed Changes',
    'Breaking Changes + Migration',
    'Verification',
    'Known Limitations',
];
function run(cmd) {
    return execSync(cmd, { encoding: 'utf8' }).trim();
}
function safeRun(cmd) {
    try {
        return run(cmd);
    }
    catch {
        return null;
    }
}
function parseArgs(argv) {
    const args = {
        tagPrefix: 'v',
        dryRun: false,
        skipTag: false,
        skipGhRelease: false,
        releaseLine: 'MVP-4',
        force: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--version')
            args.version = argv[++i];
        else if (arg === '--bump')
            args.bump = argv[++i];
        else if (arg === '--tag-prefix')
            args.tagPrefix = argv[++i];
        else if (arg === '--notes-from')
            args.notesFrom = argv[++i];
        else if (arg === '--dry-run')
            args.dryRun = true;
        else if (arg === '--skip-tag')
            args.skipTag = true;
        else if (arg === '--skip-gh-release')
            args.skipGhRelease = true;
        else if (arg === '--release-line')
            args.releaseLine = argv[++i];
        else if (arg === '--force')
            args.force = true;
        else if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        }
    }
    return args;
}
function printHelp() {
    console.log(`Release Automation CLI

Usage:
  pnpm release:cut --version <x.y.z> [options]
  pnpm release:cut --bump patch|minor|major [options]

Options:
  --version <x.y.z>     Explicit version to set
  --bump <type>         Version bump (patch|minor|major)
  --tag-prefix <str>    Tag prefix (default: v)
  --notes-from <range>  Git range for notes (default: last semver tag..HEAD)
  --release-line <str>  Release line label (default: MVP-4)
  --dry-run             Do not modify repo; write artifacts only
  --skip-tag            Do not create git tag
  --skip-gh-release     Do not create GitHub release
  --force               Bypass safety checks
`);
}
function fail(msg) {
    console.error(`❌ ${msg}`);
    process.exit(1);
}
function ensureCleanWorkingTree(force) {
    const status = run('git status --porcelain');
    if (status && !force) {
        fail('Working tree is dirty. Commit or stash changes, or use --force.');
    }
}
function ensureRequiredFiles(force) {
    if (!existsSync('docs/releases') && !force) {
        fail('docs/releases directory missing. Use --force to bypass.');
    }
}
function ensureGaVerifyStamp(force) {
    const sha = run('git rev-parse HEAD');
    const stampPath = join('artifacts', 'ga-verify', sha, 'stamp.json');
    if (!existsSync(stampPath) && !force) {
        fail(`GA verify stamp missing at ${stampPath}. Run pnpm ga:verify or use --force.`);
    }
    return stampPath;
}
function parseVersion(version) {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-rc\.\d+)?$/);
    if (!match) {
        fail(`Invalid version: ${version}. Expected x.y.z or x.y.z-rc.n`);
    }
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
    };
}
function bumpVersion(current, bump) {
    const { major, minor, patch } = parseVersion(current);
    if (bump === 'major')
        return `${major + 1}.0.0`;
    if (bump === 'minor')
        return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`;
}
function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}
function writeJson(path, data) {
    writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}
function listPackageJsons() {
    const paths = ['package.json', 'client/package.json', 'server/package.json'];
    if (existsSync('packages')) {
        const dirs = readdirSync('packages', { withFileTypes: true });
        for (const dir of dirs) {
            if (dir.isDirectory()) {
                paths.push(join('packages', dir.name, 'package.json'));
            }
        }
    }
    return paths.filter(p => existsSync(p));
}
function updateVersions(newVersion, dryRun) {
    const updated = [];
    for (const path of listPackageJsons()) {
        const pkg = readJson(path);
        if (pkg.version && pkg.version !== newVersion) {
            pkg.version = newVersion;
            if (!dryRun)
                writeJson(path, pkg);
            updated.push(path);
        }
    }
    return updated;
}
function getLatestSemverTag(prefix) {
    const tagsRaw = safeRun(`git tag --list "${prefix}*"`) || '';
    const re = new RegExp(`^${prefix.replace(/[-/\\^$*+?.()|[\\]{}]/g, '\\\\$&')}\\d+\\.\\d+\\.\\d+(?:-rc\\.\\d+)?$`);
    const tags = tagsRaw
        .split('\n')
        .map(t => t.trim())
        .filter(Boolean)
        .filter(t => re.test(t));
    if (tags.length === 0)
        return null;
    const normalize = (tag) => `v${tag.slice(prefix.length)}`;
    const sorted = [...tags].sort((a, b) => compareTags(normalize(a), normalize(b)));
    return sorted[sorted.length - 1];
}
function getGitRange(tagPrefix, notesFrom) {
    if (notesFrom)
        return notesFrom;
    const latest = getLatestSemverTag(tagPrefix);
    return latest ? `${latest}..HEAD` : 'HEAD';
}
function parseCommits(range) {
    const hashesRaw = run(`git rev-list --reverse ${range}`);
    const hashes = hashesRaw.split('\n').map(h => h.trim()).filter(Boolean);
    return hashes.map(hash => {
        const subjectBody = run(`git log -1 --format=%s%n%b ${hash}`);
        const [subject, ...bodyLines] = subjectBody.split('\n');
        const filesRaw = run(`git diff-tree --no-commit-id --name-only -r ${hash}`);
        const files = filesRaw.split('\n').map(f => f.trim()).filter(Boolean);
        return { hash, subject, body: bodyLines.join('\n'), files };
    });
}
function classifyCommit(commit) {
    const files = commit.files;
    const has = (prefixes) => files.some(f => prefixes.some(p => f.startsWith(p)));
    const contains = (tokens) => files.some(f => tokens.some(t => f.toLowerCase().includes(t)));
    if (contains(['security', 'policy', 'opa']))
        return 'security';
    if (has(['infra/', 'terraform/', 'k8s/', 'helm/', 'ops/', '.github/']))
        return 'infra';
    if (has(['server/']))
        return 'server';
    if (has(['client/', 'apps/web/', 'apps/mobile/']))
        return 'ui';
    return 'misc';
}
function extractBreaking(commits) {
    return commits.filter(c => c.subject.includes('!:') || c.body.includes('BREAKING CHANGE'));
}
function buildHighlights(commits) {
    const buckets = {
        server: [],
        ui: [],
        infra: [],
        security: [],
        misc: [],
    };
    commits.forEach(c => buckets[classifyCommit(c)].push(c));
    const order = ['server', 'ui', 'infra', 'security', 'misc'];
    const picks = [];
    for (const key of order) {
        if (buckets[key].length)
            picks.push(buckets[key][0]);
    }
    if (picks.length < 3) {
        for (const commit of commits) {
            if (!picks.includes(commit))
                picks.push(commit);
            if (picks.length >= 3)
                break;
        }
    }
    return picks.slice(0, 7);
}
function formatCommitBullet(commit) {
    return `- ${commit.subject} (${commit.hash.slice(0, 7)})`;
}
function buildReleaseNotes(releaseLine, version, range, commits) {
    const highlights = buildHighlights(commits);
    const breaking = extractBreaking(commits);
    const groups = {
        server: [],
        ui: [],
        infra: [],
        security: [],
        misc: [],
    };
    commits.forEach(c => groups[classifyCommit(c)].push(c));
    const lines = [];
    lines.push(`# ${releaseLine} — v${version}`);
    lines.push('');
    lines.push(`Git range: \`${range}\``);
    lines.push('');
    lines.push('## Highlights');
    if (highlights.length)
        highlights.forEach(c => lines.push(formatCommitBullet(c)));
    else
        lines.push('- Not evidenced');
    lines.push('');
    lines.push('## Detailed Changes');
    lines.push('');
    lines.push('### Server');
    lines.push(...(groups.server.length ? groups.server.map(formatCommitBullet) : ['- None']));
    lines.push('');
    lines.push('### UI');
    lines.push(...(groups.ui.length ? groups.ui.map(formatCommitBullet) : ['- None']));
    lines.push('');
    lines.push('### Infra');
    lines.push(...(groups.infra.length ? groups.infra.map(formatCommitBullet) : ['- None']));
    lines.push('');
    lines.push('### Security');
    lines.push(...(groups.security.length ? groups.security.map(formatCommitBullet) : ['- None']));
    lines.push('');
    lines.push('### Misc');
    lines.push(...(groups.misc.length ? groups.misc.map(formatCommitBullet) : ['- None']));
    lines.push('');
    lines.push('## Breaking Changes + Migration');
    if (breaking.length) {
        breaking.forEach(c => lines.push(formatCommitBullet(c)));
        lines.push('');
        lines.push('Migration: Not explicitly documented in commits; validate impact before upgrade.');
    }
    else {
        lines.push('- No breaking changes detected in commit subjects/bodies.');
        lines.push('');
        lines.push('Migration: Not evidenced.');
    }
    lines.push('');
    lines.push('## Verification');
    lines.push('- pnpm ga:verify');
    lines.push('- pnpm verify:governance');
    lines.push('- pnpm verify:living-documents');
    lines.push('- pnpm generate:sbom');
    lines.push('- pnpm generate:provenance');
    lines.push('');
    lines.push('## Known Limitations');
    lines.push('- Not evidenced; update if needed.');
    lines.push('');
    REQUIRED_NOTES_SECTIONS.forEach(section => {
        if (!lines.join('\n').includes(`## ${section}`)) {
            fail(`Release notes missing required section: ${section}`);
        }
    });
    return lines.join('\n');
}
function buildEvidencePack(releaseLine, version, range, stampPath) {
    const stamp = existsSync(stampPath) ? readJson(stampPath) : null;
    const lines = [];
    lines.push(`# ${releaseLine} Evidence Pack — v${version}`);
    lines.push('');
    lines.push(`Git range: \`${range}\``);
    lines.push(`Commit: \`${safeRun('git rev-parse HEAD') || 'unknown'}\``);
    lines.push('');
    lines.push('## Environment');
    lines.push(`- node: ${stamp?.node_version || process.version}`);
    lines.push(`- pnpm: ${stamp?.pnpm_version || (safeRun('pnpm -v') || 'unknown')}`);
    lines.push('');
    lines.push('## GA Verify Stamp');
    lines.push(`- ${stampPath}`);
    lines.push('');
    lines.push('## Commands');
    lines.push('- pnpm ga:verify');
    lines.push('- pnpm verify:governance');
    lines.push('- pnpm verify:living-documents');
    lines.push('- pnpm generate:sbom');
    lines.push('- pnpm generate:provenance');
    lines.push('');
    return lines.join('\n');
}
function updateChangelog(version, releaseLine, notesPath, dryRun) {
    if (!existsSync('CHANGELOG.md'))
        return;
    const content = readFileSync('CHANGELOG.md', 'utf8');
    const marker = '## [Unreleased]';
    if (!content.includes(marker))
        return;
    const date = safeRun('git log -1 --format=%cs HEAD') || 'YYYY-MM-DD';
    const entry = [
        '',
        `## [${version}] - ${releaseLine} - ${date}`,
        '',
        '### Changed',
        `- Release notes: ${notesPath}`,
        '',
    ].join('\n');
    const updated = content.replace(marker, `${marker}${entry}`);
    if (!dryRun)
        writeFileSync('CHANGELOG.md', updated);
}
function ensureArtifactsDir(tag) {
    const dir = join('artifacts', 'release', tag);
    mkdirSync(dir, { recursive: true });
    return dir;
}
function createReleaseCommit(tag, dryRun) {
    if (dryRun)
        return;
    run('git add package.json client/package.json server/package.json packages || true');
    run('git add docs/releases CHANGELOG.md || true');
    run(`git commit -m "chore(release): ${tag}"`);
}
function createTag(tag, dryRun, skipTag) {
    if (skipTag || dryRun)
        return;
    run(`git tag -a ${tag} -m "Release ${tag}"`);
}
function ghRelease(tag, notesPath, dryRun, skip) {
    if (skip)
        return;
    const gh = safeRun('command -v gh');
    const cmd = `gh release create ${tag} --title "${tag}" --notes-file ${notesPath}`;
    if (!gh || dryRun) {
        console.log(`GH command: ${cmd}`);
        return;
    }
    run(cmd);
}
function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.version && !args.bump) {
        fail('Provide --version or --bump.');
    }
    ensureCleanWorkingTree(args.force);
    ensureRequiredFiles(args.force);
    const stampPath = ensureGaVerifyStamp(args.force);
    const currentVersion = readJson('package.json').version;
    const version = args.version || bumpVersion(currentVersion, args.bump);
    const tag = `${args.tagPrefix}${version}`;
    const range = getGitRange(args.tagPrefix, args.notesFrom);
    const commits = parseCommits(range);
    const releaseLine = args.releaseLine;
    const notesPath = join('docs', 'releases', `${releaseLine}_RELEASE_NOTES.md`);
    const evidencePath = join('docs', 'releases', `${releaseLine}_EVIDENCE_PACK.md`);
    const notes = buildReleaseNotes(releaseLine, version, range, commits);
    const evidence = buildEvidencePack(releaseLine, version, range, stampPath);
    if (!args.dryRun) {
        updateVersions(version, args.dryRun);
        writeFileSync(notesPath, notes);
        writeFileSync(evidencePath, evidence);
        updateChangelog(version, releaseLine, notesPath, args.dryRun);
    }
    const artifactsDir = ensureArtifactsDir(tag);
    writeFileSync(join(artifactsDir, 'github_release.md'), notes);
    writeFileSync(join(artifactsDir, 'release_notes.md'), notes);
    writeFileSync(join(artifactsDir, 'evidence_pack.md'), evidence);
    createReleaseCommit(tag, args.dryRun);
    createTag(tag, args.dryRun, args.skipTag);
    ghRelease(tag, join(artifactsDir, 'github_release.md'), args.dryRun, args.skipGhRelease);
    console.log(`✅ Release ${tag} prepared.`);
    console.log(`Artifacts: ${artifactsDir}`);
    if (args.dryRun)
        console.log('Dry run: no repository files were modified.');
}
main();

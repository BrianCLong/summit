import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { assertVersionsAligned, collectPackages, collectWorkspaceManifestPaths } from './check-versions';

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?$/;

const UNRELEASED_TEMPLATE = [
  '',
  '### Added',
  '- (New features will be documented here)',
  '',
  '### Changed',
  '- (Changes to existing functionality)',
  '',
  '### Deprecated',
  '- (Features marked for future removal)',
  '',
  '### Removed',
  '- (Removed features)',
  '',
  '### Fixed',
  '- (Bug fixes)',
  '',
  '### Security',
  '- (Security-related changes)',
  '',
].join('\n');

function parseVersion(version: string): ParsedVersion {
  const match = SEMVER_PATTERN.exec(version);
  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    prerelease: match[4],
  };
}

function formatVersion(parsed: ParsedVersion): string {
  const base = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  return parsed.prerelease ? `${base}-${parsed.prerelease}` : base;
}

function ensurePatchBump(current: string, next: string): void {
  const currentParsed = parseVersion(current);
  const nextParsed = parseVersion(next);

  if (currentParsed.major !== nextParsed.major || currentParsed.minor !== nextParsed.minor) {
    throw new Error('Point releases must keep major and minor versions unchanged.');
  }

  if (nextParsed.patch < currentParsed.patch) {
    throw new Error('New version must not decrement the patch number.');
  }

  if (nextParsed.patch === currentParsed.patch && nextParsed.prerelease === currentParsed.prerelease) {
    throw new Error('New version must increase the patch number for point releases.');
  }
}

function incrementPatch(version: string): string {
  const parsed = parseVersion(version);
  parsed.patch += 1;
  parsed.prerelease = undefined;
  return formatVersion(parsed);
}

async function updateManifest(manifestPath: string, nextVersion: string): Promise<void> {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { version?: string };
  manifest.version = nextVersion;
  await writeFile(`${manifestPath}`, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function buildReleaseSection(version: string, body: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const cleanedBody = body.replace(/\n+---\s*$/m, '').trim();
  const releaseBody = cleanedBody.length > 0 ? cleanedBody : UNRELEASED_TEMPLATE.trim();
  return [`## [${version}] - ${today}`, releaseBody, '', '---', ''].join('\n');
}

async function updateChangelog(rootDir: string, version: string): Promise<void> {
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  const content = await readFile(changelogPath, 'utf8');
  const unreleasedSection = /## \[Unreleased\](?<body>[\s\S]*?)(?=\n## \[|$)/;
  const match = unreleasedSection.exec(content);

  if (!match || !match.groups) {
    throw new Error('Could not locate the "Unreleased" section in CHANGELOG.md');
  }

  const body = match.groups.body ?? '';
  const replacement = [
    `## [Unreleased]${UNRELEASED_TEMPLATE}`,
    buildReleaseSection(version, body),
  ].join('\n\n');

  const updated = content.replace(unreleasedSection, replacement);
  await writeFile(changelogPath, updated, 'utf8');
}

async function bumpWorkspaceVersions(rootDir: string, nextVersion: string): Promise<void> {
  const manifestDirs = await collectWorkspaceManifestPaths(rootDir);
  for (const relativeDir of manifestDirs) {
    const manifestPath = path.join(rootDir, relativeDir === '.' ? 'package.json' : `${relativeDir}/package.json`);
    await updateManifest(manifestPath, nextVersion);
  }
}

async function main(): Promise<void> {
  const rootDir = path.resolve(process.cwd());
  const [, , versionArg, ...rest] = process.argv;
  const updateChangelogFlag = rest.includes('--update-changelog');
  const autoPatch = rest.includes('--patch');

  const packages = await collectPackages(rootDir);
  const rootPackage = packages.find((pkg) => pkg.path === rootDir || pkg.path === '.') ?? packages[0];

  const currentVersion = rootPackage.version;
  const nextVersion = versionArg ? versionArg : autoPatch ? incrementPatch(currentVersion) : undefined;

  if (!nextVersion) {
    throw new Error('Provide a target version or use --patch to increment the patch number.');
  }

  ensurePatchBump(currentVersion, nextVersion);

  await bumpWorkspaceVersions(rootDir, nextVersion);

  if (updateChangelogFlag) {
    await updateChangelog(rootDir, nextVersion);
  }

  const updatedPackages = await collectPackages(rootDir);
  assertVersionsAligned(updatedPackages, nextVersion);
  console.log(`Bumped ${updatedPackages.length} packages to version ${nextVersion}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error((error as Error).message);
    process.exitCode = 1;
  });
}

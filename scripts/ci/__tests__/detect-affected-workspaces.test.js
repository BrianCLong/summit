const path = require('path');
const { detectAffected, getWorkspaceMap, loadWorkspaceGlobs } = require('../detect-affected-workspaces.js');

const fixtureRoot = path.resolve(__dirname, '../__fixtures__/monorepo');

describe('loadWorkspaceGlobs', () => {
  it('parses workspace globs from pnpm-workspace.yaml', () => {
    const globs = loadWorkspaceGlobs(fixtureRoot);
    expect(globs).toContain('apps/*');
    expect(globs).toContain('packages/*');
  });
});

describe('detectAffected', () => {
  const map = getWorkspaceMap(fixtureRoot);
  const appWorkspacePath = 'apps/app-one';
  const appWorkspaceName = map.get(appWorkspacePath);
  const sharedWorkspacePath = 'packages/shared-lib';
  const sharedWorkspaceName = map.get(sharedWorkspacePath);

  it('returns workspace name when file inside workspace changes', () => {
    const workspaces = detectAffected(fixtureRoot, { changedFiles: [`${appWorkspacePath}/src/index.ts`] });
    expect(workspaces).toContain(appWorkspaceName);
  });

  it('marks all workspaces when core lockfiles change', () => {
    const workspaces = detectAffected(fixtureRoot, { changedFiles: ['pnpm-lock.yaml'] });
    expect(workspaces).toEqual([appWorkspaceName, sharedWorkspaceName]);
  });

  it('is deterministic for the same file list', () => {
    const files = [`${appWorkspacePath}/a.ts`, `${appWorkspacePath}/b.ts`];
    const first = detectAffected(fixtureRoot, { changedFiles: files });
    const second = detectAffected(fixtureRoot, { changedFiles: files });
    expect(first).toEqual(second);
  });

  it('returns empty when no workspace is matched and no lockfiles changed', () => {
    const workspaces = detectAffected(fixtureRoot, { changedFiles: ['README.md', 'scripts/tooling.sh'] });
    expect(workspaces).toEqual([]);
  });

  it('maps multiple distinct workspaces in one diff deterministically', () => {
    const workspaces = detectAffected(fixtureRoot, {
      changedFiles: [`${appWorkspacePath}/a.ts`, `${sharedWorkspacePath}/index.ts`],
    });
    expect(workspaces).toEqual([appWorkspaceName, sharedWorkspaceName]);
  });
});

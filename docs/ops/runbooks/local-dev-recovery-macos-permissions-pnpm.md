# Local Dev Recovery (macOS): Permissions, Immutable Flags, pnpm Store, and Worktrees

This runbook restores a Summit checkout after any of these failure modes:

- **Root-owned files** created by `sudo git …` (git can’t unlink/overwrite/reset).
- **macOS immutable flags** (`uchg` / `schg`) blocking edits/deletes.
- **pnpm store mismatch** (`ERR_PNPM_UNEXPECTED_STORE`) or cache permissions breakage.
- **Nested node_modules** in subprojects causing duplicate types / “private property” TS errors.
- **_worktrees/** leaking into the repo as untracked content or a gitlink/submodule that blocks merges.
- **Merge conflicts** where cleanup attempts make things worse (because of permissions).

**Objective:** return to a user-owned, writable repo; eliminate local worktree pollution; ensure a single type-resolution surface; restore predictable pnpm behavior.

---

## Do / Don’t (print this in your head)

**DO**

- Use `sudo` only for **`chflags` / `chown` / `chmod`** to repair filesystem state.
- Run `git clean/reset/merge` **as your user** (no sudo) once permissions are normalized.
- Delete **nested** `services/*/node_modules` when you see duplicate-type identity errors.
- Quarantine local-only trees early (`_worktrees/`, scratch dirs) to avoid merge blockers.
- Snapshot scope before PR: `git diff --name-only` + `git ls-files --others --exclude-standard`.

**DON'T**

- Don't run **`sudo git …`** (creates root-owned files and guarantees future cleanup failures).
- Don't churn `pnpm install` when DNS/registry is down; fix network first.
- Don't add broad `typeRoots` without a strict `types` allowlist (TS2688 cascades).

---

## Quick Diagnostic Matrix (symptom → root cause → fix)

Use this table to jump straight to the right remediation step.

| Symptom (exact-ish)                                                                                        | Likely root cause                                                                                              | Do this now                                                                                                                                       | See section |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `sudo: unable to allocate pty: Device not configured`                                                      | You’re running sudo in a non-PTY context (common in restored sessions / detached shells)                       | Re-run the command from a normal Terminal tab/session; if you must stay non-PTY: prefer non-interactive operations and avoid sudo unless required | 1           |
| `warning: unable to unlink ... Permission denied` / `fatal: cannot create directory ... Permission denied` | Root-owned or immutable files created by `sudo git ...`                                                        | `sudo chflags -R nouchg,noschg . && sudo chown -R "$(id -un)":"$(id -gn)" . && sudo chmod -R u+rwX .`                                             | 1           |
| `Your local changes ... would be overwritten by merge` (often `DEPENDENCY_DELTA.md`, `deps/...`)           | Generated drift files or local edits blocking merge                                                            | `git restore --source=HEAD -- DEPENDENCY_DELTA.md deps/DEPENDENCY_DELTA.md`                                                                       | 4           |
| `untracked working tree files would be overwritten by merge` (many paths)                                  | You have untracked files that overlap incoming tracked files (often from failed merges / sudo clean artifacts) | `git clean -fdx` (after permissions are fixed)                                                                                                    | 1, 3        |
| `CONFLICT (content): ... STATUS.json` / “unmerged files”                                                   | Merge conflict in progress                                                                                     | `git merge --abort` OR resolve + `git add` + commit; don’t “sudo reset” mid-conflict                                                              | 2           |
| `_worktrees/... (modified content, untracked content)` or gitlink mode `160000`                            | Local worktrees committed/treated as submodule; blocks merge/clean and pollutes CI scope                       | Prefer quarantine: add `_worktrees/` to `.gitignore` + delete; if gitlink, deinit + rm submodule                                                  | 5           |
| `ERR_PNPM_UNEXPECTED_STORE Unexpected store location`                                                      | pnpm major mismatch or store-dir mismatch vs previous install                                                  | `pnpm config set store-dir "$HOME/Library/pnpm/store/v10"` then reinstall                                                                         | 6           |
| `EPERM ... Library/Preferences/pnpm/rc...`                                                                 | pnpm config directory owned by root / locked                                                                   | `sudo chown -R "$(id -un)":"$(id -gn)" "$HOME/Library/Preferences/pnpm"` then retry config set                                                    | 6           |
| `Types have separate declarations of a private property 'internals'` (Apollo/Express)                      | Duplicate dependency trees (nested `services/*/node_modules`) causing incompatible type identity               | Remove nested node_modules + force TS typeRoots to root in that service tsconfig                                                                  | 7           |
| TS2688 `Cannot find type definition file for ...` (many `@types/*`) after adding `typeRoots`               | “typeRoots grenade” — TS scans all ambient types and fails when some are missing                               | Remove broad `typeRoots`; use `compilerOptions.types` allowlist (e.g., `["node"]`)                                                                | 7, 9        |
| `git clean -fdx` fails with permissions                                                                    | You still have immutable flags / root ownership                                                                | Re-run Section 1 normalization, then retry clean/reset as user                                                                                    | 1, 3        |

**Strong default workflow:** fix filesystem once (Section 1) → clean/reset as user (Section 3) → quarantine `_worktrees` (Section 5) → fix pnpm store-dir (Section 6) → delete nested node_modules (Section 7) → rerun minimal checks (Section 8).

---

## Decision tree (fast path)

Use this if you want the shortest “if X, then Y” flow.

1. If `git clean -fdx` fails with permissions → go to **Section 1**.
2. If you see `unable to unlink` / `cannot create directory` → go to **Section 1**.
3. If merges fail due to local changes or untracked overlaps → go to **Section 3**, then **Section 4**.
4. If `_worktrees/...` shows up in `git status` → go to **Section 5**.
5. If `ERR_PNPM_UNEXPECTED_STORE` or pnpm EPERM → go to **Section 6**.
6. If Apollo/Express types mismatch or “private property” errors → go to **Section 7**.
7. If TS2688 cascades after `typeRoots` changes → go to **Offline TypeScript containment**.
8. If DNS/registry is down (ENOTFOUND) → go to **When the registry/DNS is down**.

---

## Canonical recovery command (one-shot)

Use this when you want one copy/paste sequence to recover the repo and re‑validate quickly.

```bash
# permissions + normalize
sudo chflags -R nouchg,noschg .
sudo chown -R "$(id -un)":"$(id -gn)" .
sudo chmod -R u+rwX .

# abort any in-flight operations
git merge --abort 2>/dev/null || true
git rebase --abort 2>/dev/null || true
git cherry-pick --abort 2>/dev/null || true

# clean/reset
git clean -fdx
git reset --hard HEAD

# quarantine local worktrees
printf "\n# local worktrees\n_worktrees/\n" >> .gitignore
rm -rf _worktrees
git add .gitignore

# remove nested installs that poison types (example)
rm -rf services/api-gateway/node_modules

# validate
pnpm -w typecheck
node --test testing/ga-verification/ui-route-audit.ga.test.mjs
git status --porcelain=v1
```

Expected: typecheck and GA test succeed; `git status` only shows intentional edits.

---

## Known-good command bundles

Use these as copy/paste bundles when you want the shortest path to recovery.

### Recover repo (permissions + clean)

```bash
sudo chflags -R nouchg,noschg .
sudo chown -R "$(id -un)":"$(id -gn)" .
sudo chmod -R u+rwX .
git merge --abort 2>/dev/null || true
git rebase --abort 2>/dev/null || true
git cherry-pick --abort 2>/dev/null || true
git clean -fdx
git reset --hard HEAD
```

### Recover pnpm (store-dir + ownership)

```bash
pnpm config set store-dir "$HOME/Library/pnpm/store/v10"
sudo chown -R "$(id -un)":"$(id -gn)" "$HOME/Library/Preferences/pnpm" 2>/dev/null || true
sudo chown -R "$(id -un)":"$(id -gn)" "$HOME/.pnpm-store" "$HOME/Library/Caches/pnpm" 2>/dev/null || true
```

### Quarantine local worktrees

```bash
printf "\n# local worktrees\n_worktrees/\n" >> .gitignore
rm -rf _worktrees
git add .gitignore
```

---

### PR hygiene: prevent untracked sprawl from contaminating diffs

If `git ls-files --others --exclude-standard` shows **dozens of unrelated files**, treat it as a **scope hazard** before you open a PR.

**Fast classify**

- “Intended PR scope” files are directly tied to the work item (e.g., UI route audit remediation).
- Everything else is either:
  - accidental local artifacts (sandbox, fixtures, experiments),
  - a second feature stream (e.g., *openai-docs skill*),
  - or temporary offline shims (e.g., stub types).

**Recommended operator flow**

1. Snapshot untracked list:

```bash
git ls-files --others --exclude-standard > /tmp/untracked.txt
```

2. Decide scope explicitly:

- keep only “intended”
- or split into multiple PRs

3. Remove unwanted untracked files safely:

```bash
# example: remove a whole accidental stream
rm -rf skills/openai-docs scripts/skills tests/fixtures/openai-docs-skill
```

4. Re-check:

```bash
git status --porcelain=v1
git ls-files --others --exclude-standard
```

**Rule:** if the PR is “UI GA route audit remediation”, do not ship unrelated runbooks/skills/sandbox unless explicitly intended.

---

## PR scope gate (prevent surprise diffs)

Before opening a PR, run:

```bash
git diff --name-only
git ls-files --others --exclude-standard
```

**Rule:** if you see a second feature stream (skills, sandboxes, large doc sets) and your PR is not explicitly about that stream, either:

1) delete the unintended untracked trees (`rm -rf <paths>`), or  
2) split work into multiple PRs.

Re-check until `git ls-files --others --exclude-standard` matches your intended scope.

---

## When the registry/DNS is down (offline mode)

If installs fail with errors like:

- `ENOTFOUND registry.npmjs.org`
- `ERR_PNPM_META_FETCH_FAIL ... (ENOTFOUND)`
- `ENOTFOUND https://cdn.sheetjs.com/...`

You will not be able to add missing dependencies or `@types/*` packages until DNS/network is restored.

### What you can do safely while offline

- Fix repo filesystem state (Section 1).
- Clean/reset the working tree (Section 3).
- Remove nested `node_modules` that poison type identity (Section 7).
- Run build/typecheck using already-present dependencies.

### Quick network sanity checks

```bash
nslookup registry.npmjs.org || true
curl -I https://registry.npmjs.org/ 2>/dev/null | head -n 5 || true
curl -I https://cdn.sheetjs.com/ 2>/dev/null | head -n 5 || true
```

If these fail, treat dependency installation as blocked; do not churn `pnpm install` repeatedly.

---

## Detect and remove nested node_modules (type identity breakage)

TypeScript errors that almost always indicate duplicate dependency trees:

- `Types have separate declarations of a private property 'internals'` (ApolloServer)
- Express middleware handler types not assignable due to two different `@types/express*` paths

### Detect nested installs

```bash
find services -maxdepth 3 -type d -name node_modules -print
find packages -maxdepth 3 -type d -name node_modules -print
```

If you see `services/<x>/node_modules`, that project can “shadow” the workspace root types and break `pnpm -w typecheck`.

### Remove the nested install (example)

```bash
rm -rf services/api-gateway/node_modules
```

Then re-run:

```bash
pnpm -w typecheck
```

---

## FAQ (top recurring errors)

1. **`sudo: unable to allocate pty: Device not configured`**  
Fix: re-run the command in a normal Terminal session; avoid sudo in non‑PTY shells. See **Section 0** and **Section 1**.

2. **`_worktrees/... (modified content, untracked content)`**  
Fix: quarantine `_worktrees/` via `.gitignore` and delete local worktrees, or deinit submodule if it’s a gitlink. See **Section 5**.

3. **`ERR_PNPM_UNEXPECTED_STORE Unexpected store location`**  
Fix: set store‑dir to `~/Library/pnpm/store/v10` and fix ownership on pnpm preferences. See **Section 6**.

4. **`Types have separate declarations of a private property 'internals'`**  
Fix: remove nested `services/*/node_modules` and pin type resolution to root. See **Section 7**.

5. **`TS2688: Cannot find type definition file for '...'` (many @types)**  
Fix: use a `types` allowlist (e.g., `["node"]`) and avoid broad `typeRoots` until network is healthy. See **Offline TypeScript containment**.

---

## 0) Rule Zero: don’t use `sudo git`

If you run:

- `sudo git clean -fdx`
- `sudo git reset --hard`
- `sudo git checkout …`
  you will eventually get:
- `warning: unable to unlink … Permission denied`
- `fatal: cannot create directory … Permission denied`
- merges failing due to unremovable untracked files

**Correct pattern:** use `sudo` only for `chflags/chown/chmod` once to repair filesystem state, then use **non-sudo git** forever after.

---

## 1) One-time filesystem normalization (macOS)

From repo root:

```bash
# Clear BOTH user + system immutable flags
sudo chflags -R nouchg,noschg .

# Take ownership of the repo
sudo chown -R "$(id -un)":"$(id -gn)" .

# Ensure user-writable (avoid 777)
sudo chmod -R u+rwX .
```

### Targeted repair (preferred when the repo is huge)

If you only hit failures in specific trees (common: `evidence/`, `webapp/`, `tests/fixtures/`), run:

```bash
sudo chflags -R nouchg,noschg evidence webapp tests/fixtures || true
sudo chown -R "$(id -un)":"$(id -gn)" evidence webapp tests/fixtures || true
sudo chmod -R u+rwX evidence webapp tests/fixtures || true
```

---

## 2) Get out of “stuck merge / unmerged files” state safely

### Abort in-progress operations

```bash
git merge --abort 2>/dev/null || true
git rebase --abort 2>/dev/null || true
git cherry-pick --abort 2>/dev/null || true
```

### Confirm status

```bash
git status --porcelain=v1
```

If you still see **unmerged paths**, resolve them normally (edit + `git add`) and commit, or abort the merge and retry after the repo is clean.

---

## 3) Clean the working tree (WITHOUT sudo)

### Remove untracked files

```bash
git clean -fdx
```

### Reset tracked changes

```bash
git reset --hard HEAD
```

If either command fails with permission errors, return to **Section 1** (you still have root-owned or immutable content).

---

## 4) Stop “merge blocked by local changes” from auto-generated files

Common offender in Summit: dependency delta / generated artifacts.

If merge complains about local changes (e.g. `DEPENDENCY_DELTA.md` or `deps/DEPENDENCY_DELTA.md`), prefer to discard and regenerate deterministically later:

```bash
git restore --source=HEAD -- DEPENDENCY_DELTA.md deps/DEPENDENCY_DELTA.md
```

---

## 5) Quarantine `_worktrees/` (prevents merge + CI scope pollution)

### If `_worktrees/` is local-only (most common)

```bash
printf "\n# local worktrees\n_worktrees/\n" >> .gitignore
rm -rf _worktrees
git add .gitignore
```

### If `_worktrees/...` is a gitlink/submodule (mode `160000`)

```bash
git submodule deinit -f _worktrees/governance-drift-signal-integrity 2>/dev/null || true
git rm -f _worktrees/governance-drift-signal-integrity 2>/dev/null || true
rm -rf .git/modules/_worktrees/governance-drift-signal-integrity 2>/dev/null || true
git add .gitmodules .gitignore 2>/dev/null || true
```

---

## 6) pnpm store-dir mismatch recovery (no sudo pnpm)

### Check store-dir + version

```bash
pnpm -v
pnpm config get store-dir
```

### Set store-dir (user-level)

```bash
pnpm config set store-dir "$HOME/Library/pnpm/store/v10"
```

If `pnpm config set …` fails with EPERM, fix the pnpm preference directory ownership:

```bash
sudo chown -R "$(id -un)":"$(id -gn)" "$HOME/Library/Preferences/pnpm" 2>/dev/null || true
```

### Fix pnpm cache ownership (only if needed)

```bash
sudo chown -R "$(id -un)":"$(id -gn)" "$HOME/.pnpm-store" "$HOME/Library/Caches/pnpm" 2>/dev/null || true
```

---

## 7) Prevent duplicate-type explosions: delete nested node_modules

Symptom signatures:

- `Types have separate declarations of a private property 'internals'`
- express middleware type mismatch between two `node_modules` paths
- ApolloServer mismatch across two import paths

**Fix:** remove nested node_modules in the offending workspace(s), and force type resolution to root.

Example (api-gateway):

1. Ensure `services/api-gateway/tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "typeRoots": ["../../node_modules/@types"],
    "types": ["node"]
  }
}
```

2. Remove nested install:

```bash
rm -rf services/api-gateway/node_modules
```

3. Validate:

```bash
pnpm -w typecheck
```

---

## Offline TypeScript containment (TS2688 cascades)

If you hit:

- `TS2688: Cannot find type definition file for '...'.`

and especially if it explodes into *many* missing `@types/*` libs after changing `typeRoots`, you likely hit the **typeRoots grenade** (TS scanning ambient types broadly).

### Containment pattern (safe default)

Prefer a **types allowlist** over broad `typeRoots`.

```json
{
  "compilerOptions": {
    "types": ["node"]
  }
}
```

This prevents TypeScript from auto-loading every visible ambient type package.

### Undo once registry is healthy

When network/DNS is restored and you can install the real missing typings:

1) Add the correct devDependencies (scoped to the package that needs them)
2) Remove any temporary containment edits if no longer required
3) Re-run `pnpm -w typecheck`

---

### Temporary offline stubs (last resort)

If the registry/DNS is down and you **cannot** install missing `@types/*` packages, you may temporarily add **package-local stub typings** to unblock compilation.

**Signal you’re in this state:** you see missing type libs and you cannot fetch packages due to `ENOTFOUND`/`ERR_PNPM_META_FETCH_FAIL`.

**How to do it safely**

- Keep stubs **scoped to one package** (do not add repo-wide `typeRoots` without a strict `types` allowlist).
- Add a README that states: **temporary, remove when network is back**.
- Prefer `compilerOptions.types` allowlisting (e.g. `["node"]`) first.

**Undo when network is healthy**

1. Install real typings in the *specific* workspace that needs them, e.g.:

```bash
pnpm -C packages/orchestrator-store add -D @types/<package>
```

2. Delete temporary stubs:

```bash
rm -rf packages/orchestrator-store/types
```

3. Re-run:

```bash
pnpm -C packages/orchestrator-store run build
pnpm -w typecheck
```

---

## Return-to-normal (after the incident)

Once DNS/registry is healthy:

1) Remove temporary offline shims (example):

```bash
rm -rf packages/orchestrator-store/types
```

2) Install real typings in the workspace that needs them (example):

```bash
pnpm -C packages/orchestrator-store add -D @types/hapi__catbox @types/hapi__shot
```

3) Re-run:

```bash
pnpm -C packages/orchestrator-store run build
pnpm -w typecheck
```

4) If you added containment-only `types: ["node"]` in multiple tsconfigs, consider a follow-up PR to narrow/remove them where unnecessary.

---

## 8) Minimal confidence checks (fast)

Run only these after recovery:

```bash
pnpm -C packages/orchestrator-store run build
pnpm -w typecheck
node --test testing/ga-verification/ui-route-audit.ga.test.mjs
git status --porcelain=v1
```

---

## 9) Known-bad actions (avoid)

- `sudo git …` (creates root-owned files; guarantees future pain)
- `sudo pnpm …` (creates root-owned cache + store artifacts)
- adding broad `typeRoots` without a strict `types` allowlist (causes TS2688 cascades)

Use `sudo` only for: `chflags`, `chown`, `chmod`.

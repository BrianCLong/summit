# Agent Worktrees

Lightweight git worktrees let multiple agents (Codex/Jules/Claude) work in parallel branches without stepping on each other. Each worktree lives in a sibling directory named `<repo>--<branch>` so it is easy to see which branch a workspace represents and to clean it up safely.

## Naming and location

- Repo root is discovered automatically via `git rev-parse --show-toplevel` so commands work from any subdirectory.
- Worktrees are created next to the main repo directory: `../<repo_basename>--<branch>`.
- Removal only proceeds when the current worktree root name matches `<repo>--<branch>` to avoid deleting arbitrary folders.

## Shell usage (macOS/Linux)

- Create: `scripts/agent-worktree.sh wt-new <branch>`
- Remove: `scripts/agent-worktree.sh wt-rm`

## PowerShell usage (Windows)

- Create: `./scripts/agent-worktree.ps1 wt-new <branch>`
- Remove: `./scripts/agent-worktree.ps1 wt-rm`

## pnpm shortcuts

- Create: `pnpm wt:new -- <branch>`
- Remove: `pnpm wt:rm`

These wrappers choose the shell script on macOS/Linux and PowerShell on Windows.

## Safety rules

- Branch name is required for creation; the command aborts if the target path already exists.
- Removal checks the worktree directory name contains `--` (e.g., `summit--my-branch`) before proceeding.
- Deletion happens from the original repo root (`git worktree remove` + `git branch -D`) after a confirmation prompt (`gum confirm` when available, otherwise a `y/N` prompt).
- If [`mise`](https://github.com/jdx/mise) is installed, `mise trust` runs automatically after creation, but failures there do not block the workflow.
- Branch names with slashes create nested worktree folders (for example, `summit--feature/agent-flow`), and removal reconstructs the full branch name from that path.

## Examples

```sh
# Create a worktree from anywhere in the repo
scripts/agent-worktree.sh wt-new feature/agent-flow

# Remove from inside the worktree
cd ../summit--feature/agent-flow
scripts/agent-worktree.sh wt-rm
```

## Manual test checklist

Copy/paste these commands to validate locally:

```sh
# 1) Create a worktree
scripts/agent-worktree.sh wt-new demo/wt-test

# 2) Enter the worktree and inspect git state
cd ../summit--demo/wt-test
pwd
git status -sb

# 3) Remove the worktree and branch
scripts/agent-worktree.sh wt-rm

# 4) Verify cleanup (back in original repo)
cd ../summit
if git show-ref --verify --quiet refs/heads/demo/wt-test; then echo "branch still exists"; else echo "branch removed"; fi
if [ -d ../summit--demo/wt-test ]; then echo "worktree still exists"; else echo "worktree removed"; fi
```

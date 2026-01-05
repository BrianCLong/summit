#!/usr/bin/env bash
#
# recreate-pr.sh
#
# Helper script to assist authors in recreating a blocked PR onto current main.
# Does NOT push or open PRs automatically - only prepares local branches.
#
# Usage:
#   ./scripts/migration/recreate-pr.sh --old-pr 15400 --old-branch feature/my-feature
#   ./scripts/migration/recreate-pr.sh --old-pr 15400 --old-branch feature/my-feature --apply
#   ./scripts/migration/recreate-pr.sh --old-pr 15400 --old-branch feature/my-feature --start abc123 --end def456
#
# Options:
#   --old-pr <num>       PR number being recreated (required)
#   --old-branch <name>  Branch name of the old PR (required)
#   --start <sha>        Start commit for cherry-pick range (optional)
#   --end <sha>          End commit for cherry-pick range (optional, defaults to HEAD of old branch)
#   --apply              Actually perform git operations (default is dry-run)
#   --help               Show this help message

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Defaults
OLD_PR=""
OLD_BRANCH=""
START_SHA=""
END_SHA=""
DRY_RUN=true

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --old-pr)
      OLD_PR="$2"
      shift 2
      ;;
    --old-branch)
      OLD_BRANCH="$2"
      shift 2
      ;;
    --start)
      START_SHA="$2"
      shift 2
      ;;
    --end)
      END_SHA="$2"
      shift 2
      ;;
    --apply)
      DRY_RUN=false
      shift
      ;;
    --help|-h)
      head -30 "$0" | tail -25
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Validate required args
if [[ -z "$OLD_PR" ]]; then
  echo -e "${RED}Error: --old-pr is required${NC}"
  exit 1
fi

if [[ -z "$OLD_BRANCH" ]]; then
  echo -e "${RED}Error: --old-branch is required${NC}"
  exit 1
fi

# Generate branch name
SLUG=$(echo "$OLD_BRANCH" | sed 's/[^a-zA-Z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-30)
NEW_BRANCH="recreate/pr-${OLD_PR}-${SLUG}"

echo -e "${BLUE}=== PR Recreation Helper ===${NC}"
echo ""

if $DRY_RUN; then
  echo -e "${YELLOW}DRY RUN MODE - No changes will be made${NC}"
  echo -e "${YELLOW}Use --apply to actually perform git operations${NC}"
  echo ""
fi

echo -e "${CYAN}Old PR:${NC}      #${OLD_PR}"
echo -e "${CYAN}Old Branch:${NC}  ${OLD_BRANCH}"
echo -e "${CYAN}New Branch:${NC}  ${NEW_BRANCH}"
echo ""

# Check for clean working directory
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo -e "${RED}Error: Working directory is not clean. Commit or stash changes first.${NC}"
  exit 1
fi

# Step 1: Fetch latest
echo -e "${BLUE}Step 1: Fetch latest from origin${NC}"
if $DRY_RUN; then
  echo -e "  ${YELLOW}○${NC} Would run: git fetch origin"
else
  git fetch origin
  echo -e "  ${GREEN}✓${NC} Fetched origin"
fi

# Step 2: Fetch old branch
echo -e "${BLUE}Step 2: Fetch old branch${NC}"
if $DRY_RUN; then
  echo -e "  ${YELLOW}○${NC} Would run: git fetch origin ${OLD_BRANCH}:${OLD_BRANCH}"
else
  if git fetch origin "${OLD_BRANCH}:${OLD_BRANCH}" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Fetched ${OLD_BRANCH}"
  else
    echo -e "  ${YELLOW}!${NC} Branch might already exist locally or not exist on remote"
    echo -e "  ${YELLOW}!${NC} Trying to use local branch..."
    if ! git rev-parse --verify "${OLD_BRANCH}" &>/dev/null; then
      echo -e "${RED}Error: Cannot find branch ${OLD_BRANCH}${NC}"
      exit 1
    fi
  fi
fi

# Step 3: Identify commits to cherry-pick
echo -e "${BLUE}Step 3: Identify commits to cherry-pick${NC}"

if [[ -n "$START_SHA" ]]; then
  # Use provided range
  if [[ -z "$END_SHA" ]]; then
    END_SHA="${OLD_BRANCH}"
  fi
  COMMIT_RANGE="${START_SHA}..${END_SHA}"
  echo -e "  Using provided range: ${COMMIT_RANGE}"
else
  # Try to find merge-base with main
  if $DRY_RUN; then
    echo -e "  ${YELLOW}○${NC} Would identify commits unique to ${OLD_BRANCH}"
    echo -e "  ${YELLOW}○${NC} Using: git log --oneline origin/main..${OLD_BRANCH}"
    COMMIT_RANGE="origin/main..${OLD_BRANCH}"
  else
    # Note: This may not work well for unrelated histories, which is expected
    COMMIT_RANGE="origin/main..${OLD_BRANCH}"
  fi
fi

# Show commits that would be cherry-picked
echo ""
echo -e "${CYAN}Commits to port:${NC}"
if $DRY_RUN; then
  echo -e "  ${YELLOW}(commits will be shown after --apply fetches the branch)${NC}"
else
  if git log --oneline "${COMMIT_RANGE}" 2>/dev/null | head -20; then
    COMMIT_COUNT=$(git log --oneline "${COMMIT_RANGE}" 2>/dev/null | wc -l | tr -d ' ')
    echo ""
    echo -e "  ${CYAN}Total:${NC} ${COMMIT_COUNT} commits"
  else
    echo -e "  ${YELLOW}Cannot determine commits (expected for unrelated histories)${NC}"
    echo -e "  ${YELLOW}You may need to manually identify commits using: git log ${OLD_BRANCH}${NC}"
  fi
fi
echo ""

# Step 4: Create new branch from main
echo -e "${BLUE}Step 4: Create new branch from origin/main${NC}"
if $DRY_RUN; then
  echo -e "  ${YELLOW}○${NC} Would run: git checkout -b ${NEW_BRANCH} origin/main"
else
  if git checkout -b "${NEW_BRANCH}" origin/main; then
    echo -e "  ${GREEN}✓${NC} Created ${NEW_BRANCH} from origin/main"
  else
    echo -e "${RED}Error: Failed to create branch${NC}"
    exit 1
  fi
fi

# Step 5: Cherry-pick or provide instructions
echo -e "${BLUE}Step 5: Cherry-pick commits${NC}"

if $DRY_RUN; then
  echo -e "  ${YELLOW}○${NC} Would attempt cherry-pick of commits from ${OLD_BRANCH}"
  echo ""
  echo -e "${BOLD}When you run with --apply, the script will:${NC}"
  echo "  1. Create branch ${NEW_BRANCH} from origin/main"
  echo "  2. Attempt to cherry-pick commits from ${OLD_BRANCH}"
  echo "  3. Stop if conflicts occur (you resolve manually)"
  echo ""
else
  echo -e "  Attempting cherry-pick..."

  # Get list of commits to cherry-pick (in order)
  COMMITS=$(git log --reverse --format="%H" "${COMMIT_RANGE}" 2>/dev/null || true)

  if [[ -z "$COMMITS" ]]; then
    echo -e "  ${YELLOW}!${NC} Could not auto-detect commits (unrelated histories)"
    echo ""
    echo -e "${BOLD}Manual cherry-pick instructions:${NC}"
    echo "  1. List commits on old branch:"
    echo "     git log --oneline ${OLD_BRANCH}"
    echo ""
    echo "  2. Cherry-pick your commits one by one:"
    echo "     git cherry-pick <sha1>"
    echo "     git cherry-pick <sha2>"
    echo "     ..."
    echo ""
    echo "  3. If using patches instead:"
    echo "     git checkout ${OLD_BRANCH}"
    echo "     git format-patch -o /tmp/patches --root  # or specify range"
    echo "     git checkout ${NEW_BRANCH}"
    echo "     git am /tmp/patches/*.patch"
  else
    CHERRY_PICK_FAILED=false
    for commit in $COMMITS; do
      echo -e "  Cherry-picking ${commit:0:8}..."
      if ! git cherry-pick "$commit" --no-commit 2>/dev/null; then
        echo -e "  ${YELLOW}!${NC} Conflict on ${commit:0:8}"
        CHERRY_PICK_FAILED=true
        break
      fi
      git commit -C "$commit" 2>/dev/null || true
    done

    if $CHERRY_PICK_FAILED; then
      echo ""
      echo -e "${YELLOW}Cherry-pick stopped due to conflict.${NC}"
      echo "Resolve conflicts, then:"
      echo "  git add <resolved files>"
      echo "  git cherry-pick --continue"
      echo ""
    else
      echo -e "  ${GREEN}✓${NC} All commits cherry-picked successfully"
    fi
  fi
fi

echo ""
echo -e "${BLUE}=== Next Steps ===${NC}"
echo ""
echo "1. Review and test your changes:"
echo "   pnpm install"
echo "   pnpm test"
echo "   pnpm typecheck"
echo ""
echo "2. Push your new branch:"
echo "   git push -u origin ${NEW_BRANCH}"
echo ""
echo "3. Open a new PR with this in the description:"
echo "   ---"
echo "   Supersedes #${OLD_PR}"
echo "   ---"
echo ""
echo "4. After merge, close the old PR #${OLD_PR}"
echo ""

if $DRY_RUN; then
  echo -e "${YELLOW}Run with --apply to execute these steps.${NC}"
fi

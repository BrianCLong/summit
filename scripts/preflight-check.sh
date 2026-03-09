#!/usr/bin/env bash
# Summit Platform – Pre-Deploy Preflight Check
# Usage: ./scripts/preflight-check.sh [--env <staging|production>] [--strict]
#
# Runs before any deployment to validate environment, config, dependencies,
# and release-critical artefacts.
#
# Exit codes:
#   0 - all checks passed
#   1 - one or more checks failed (details printed to stderr)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENV="staging"
STRICT=false
FAILED=0

# ── Parse args ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)      ENV="$2";   shift 2 ;;
    --strict)   STRICT=true; shift ;;
    *)          echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ── Colours / helpers ────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

pass()  { echo -e "  ${GREEN}✅ PASS${NC}  $*"; }
fail()  { echo -e "  ${RED}❌ FAIL${NC}  $*" >&2; FAILED=$((FAILED + 1)); }
warn()  { echo -e "  ${YELLOW}⚠️  WARN${NC}  $*"; }
section(){ echo -e "\n${CYAN}=== $* ===${NC}"; }

echo ""
echo -e "${CYAN}Summit Pre-Deploy Preflight Check${NC}"
echo -e "Environment : ${ENV}"
echo -e "Strict mode : ${STRICT}"
echo -e "Timestamp   : $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ── Section 1: Tool prerequisites ────────────────────────────────────────────
section "Tool Prerequisites"

for tool in node pnpm git curl jq; do
  if command -v "$tool" &>/dev/null; then
    pass "$tool found ($(command -v "$tool"))"
  else
    fail "$tool is not installed or not on PATH"
  fi
done

# Node version check (requires >=22)
NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])" 2>/dev/null || echo "0")
if [[ "$NODE_MAJOR" -ge 22 ]]; then
  pass "Node.js version ${NODE_MAJOR} >= 22"
else
  fail "Node.js version ${NODE_MAJOR} is below required 22"
fi

# ── Section 2: Required files present ────────────────────────────────────────
section "Required Files"

REQUIRED_FILES=(
  "package.json"
  "pnpm-lock.yaml"
  ".env.example"
  "Dockerfile"
  "server/src/index.ts"
  "server/src/config.ts"
  "server/src/routes/health.ts"
)

for f in "${REQUIRED_FILES[@]}"; do
  if [[ -f "${REPO_ROOT}/${f}" ]]; then
    pass "${f} present"
  else
    fail "${f} missing"
  fi
done

# ── Section 3: Environment variables ─────────────────────────────────────────
section "Environment Variables"

# Load .env if present (non-production)
ENV_FILE="${REPO_ROOT}/.env"
if [[ -f "$ENV_FILE" && "$ENV" != "production" ]]; then
  warn "Loading ${ENV_FILE} (not for production – secrets should come from secret manager)"
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

# Required vars that must be set
REQUIRED_VARS=(
  DATABASE_URL
  NEO4J_URI
  NEO4J_USER
  NEO4J_PASSWORD
  JWT_SECRET
  JWT_REFRESH_SECRET
)

for var in "${REQUIRED_VARS[@]}"; do
  val="${!var:-}"
  if [[ -z "$val" ]]; then
    fail "${var} is not set"
  elif echo "$val" | grep -qiE "(change_me|replace_me|localhost|devpassword|placeholder)" && [[ "$ENV" == "production" ]]; then
    fail "${var} contains a placeholder/dev value in production"
  else
    pass "${var} is set"
  fi
done

# Production-only stricter checks
if [[ "$ENV" == "production" ]]; then
  # JWT secrets must be 32+ chars
  for sec in JWT_SECRET JWT_REFRESH_SECRET SESSION_SECRET; do
    val="${!sec:-}"
    if [[ ${#val} -lt 32 ]]; then
      fail "${sec} must be at least 32 characters in production (length: ${#val})"
    else
      pass "${sec} length OK (${#val} chars)"
    fi
  done

  # NODE_ENV must be production
  if [[ "${NODE_ENV:-}" == "production" ]]; then
    pass "NODE_ENV=production"
  else
    fail "NODE_ENV must be 'production' for production deployment, got: '${NODE_ENV:-unset}'"
  fi

  # CONFIG_VALIDATE_ON_START
  if [[ "${CONFIG_VALIDATE_ON_START:-false}" == "true" ]]; then
    pass "CONFIG_VALIDATE_ON_START=true"
  else
    warn "CONFIG_VALIDATE_ON_START is not 'true' – production should fail-fast on bad config"
    if [[ "$STRICT" == "true" ]]; then
      FAILED=$((FAILED + 1))
    fi
  fi

  # SEMANTIC_VALIDATION_ENABLED must be false (stub, not safe)
  if [[ "${SEMANTIC_VALIDATION_ENABLED:-false}" == "true" ]]; then
    fail "SEMANTIC_VALIDATION_ENABLED=true in production (this is a STUB – not safe for production)"
  else
    pass "SEMANTIC_VALIDATION_ENABLED=false (safe)"
  fi
fi

# ── Section 4: Git state ──────────────────────────────────────────────────────
section "Git State"

DIRTY=$(git -C "${REPO_ROOT}" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [[ "$DIRTY" -eq 0 ]]; then
  pass "Working tree is clean"
else
  warn "Working tree has ${DIRTY} uncommitted change(s)"
  if [[ "$ENV" == "production" && "$STRICT" == "true" ]]; then
    fail "Production deployment requires a clean working tree (strict mode)"
  fi
fi

GIT_TAG=$(git -C "${REPO_ROOT}" describe --tags --exact-match HEAD 2>/dev/null || echo "")
if [[ -n "$GIT_TAG" ]]; then
  pass "HEAD is tagged: ${GIT_TAG}"
else
  warn "HEAD is not on a tagged commit"
  if [[ "$ENV" == "production" && "$STRICT" == "true" ]]; then
    fail "Production deployment requires a tagged commit (strict mode)"
  fi
fi

# ── Section 5: Dependency lock file ──────────────────────────────────────────
section "Dependencies"

LOCK_FILE="${REPO_ROOT}/pnpm-lock.yaml"
PKG_FILE="${REPO_ROOT}/package.json"

if [[ -f "$LOCK_FILE" ]]; then
  LOCK_MTIME=$(stat -c %Y "$LOCK_FILE" 2>/dev/null || stat -f %m "$LOCK_FILE" 2>/dev/null || echo 0)
  PKG_MTIME=$(stat  -c %Y "$PKG_FILE"  2>/dev/null || stat -f %m "$PKG_FILE"  2>/dev/null || echo 0)
  if [[ "$PKG_MTIME" -gt "$LOCK_MTIME" ]]; then
    warn "package.json is newer than pnpm-lock.yaml – run 'pnpm install' to sync"
  else
    pass "pnpm-lock.yaml is up to date"
  fi
else
  fail "pnpm-lock.yaml not found"
fi

# ── Section 6: Build artefacts ────────────────────────────────────────────────
section "Build Artefacts"

BUILD_DIRS=(
  "server/dist"
)

for d in "${BUILD_DIRS[@]}"; do
  if [[ -d "${REPO_ROOT}/${d}" ]]; then
    pass "${d} exists"
  else
    warn "${d} not found – ensure production build has been run before deployment"
    if [[ "$STRICT" == "true" ]]; then
      fail "${d} missing (strict mode)"
    fi
  fi
done

# ── Section 7: Docker (if available) ─────────────────────────────────────────
section "Docker"

if command -v docker &>/dev/null; then
  pass "docker found"
  if docker info &>/dev/null 2>&1; then
    pass "Docker daemon is reachable"
  else
    warn "Docker daemon not reachable – skipping image checks"
  fi
else
  warn "docker not found – skipping container checks"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
if [[ "$FAILED" -eq 0 ]]; then
  echo -e "${GREEN}✅ All preflight checks passed. Proceed with deployment.${NC}"
  exit 0
else
  echo -e "${RED}❌ ${FAILED} preflight check(s) FAILED. Resolve issues before deploying.${NC}"
  exit 1
fi

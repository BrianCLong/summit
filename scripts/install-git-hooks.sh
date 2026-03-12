#!/bin/bash

##
# S-AOS Git Hooks Installation Script
#
# Installs pre-commit and commit-msg hooks for S-AOS compliance validation.
#
# Usage: ./scripts/install-git-hooks.sh [--force]
##

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
FORCE=false
if [[ "$1" == "--force" ]]; then
  FORCE=true
fi

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  S-AOS Git Hooks Installation                          ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Check if in git repository
if [ ! -d ".git" ]; then
  echo -e "${RED}✗ Not in a git repository${NC}"
  echo "  Please run this script from the repository root"
  exit 1
fi

echo -e "${GREEN}✓ Git repository detected${NC}"
echo ""

# Check if hooks exist
HOOKS_DIR=".git/hooks"
PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"
COMMIT_MSG_HOOK="$HOOKS_DIR/commit-msg"

echo "Installing hooks..."
echo ""

# ============================================================================
# Install pre-commit hook
# ============================================================================

if [ -f "$PRE_COMMIT_HOOK" ] && [ "$FORCE" != true ]; then
  echo -e "${YELLOW}⚠ pre-commit hook already exists${NC}"
  echo "  Location: $PRE_COMMIT_HOOK"
  echo "  Use --force to overwrite"
  echo ""
else
  echo "Installing pre-commit hook..."
  cp scripts/hooks/pre-commit "$PRE_COMMIT_HOOK"
  chmod +x "$PRE_COMMIT_HOOK"
  echo -e "${GREEN}✓ pre-commit hook installed${NC}"
  echo ""
fi

# ============================================================================
# Install commit-msg hook
# ============================================================================

if [ -f "$COMMIT_MSG_HOOK" ] && [ "$FORCE" != true ]; then
  echo -e "${YELLOW}⚠ commit-msg hook already exists${NC}"
  echo "  Location: $COMMIT_MSG_HOOK"
  echo "  Use --force to overwrite"
  echo ""
else
  echo "Installing commit-msg hook..."
  cp scripts/hooks/commit-msg "$COMMIT_MSG_HOOK"
  chmod +x "$COMMIT_MSG_HOOK"
  echo -e "${GREEN}✓ commit-msg hook installed${NC}"
  echo ""
fi

# ============================================================================
# Configure git commit template
# ============================================================================

echo "Configuring git commit template..."

if git config --local commit.template >/dev/null 2>&1; then
  CURRENT_TEMPLATE=$(git config --local commit.template)
  if [[ "$CURRENT_TEMPLATE" == ".gitmessage" ]]; then
    echo -e "${GREEN}✓ Git template already configured${NC}"
  else
    echo -e "${YELLOW}⚠ Git template already set to: $CURRENT_TEMPLATE${NC}"
    if [ "$FORCE" == true ]; then
      git config --local commit.template .gitmessage
      echo -e "${GREEN}✓ Git template updated to .gitmessage${NC}"
    else
      echo "  Use --force to change to .gitmessage"
    fi
  fi
else
  git config --local commit.template .gitmessage
  echo -e "${GREEN}✓ Git template configured${NC}"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Installation Complete                                  ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

echo "Installed hooks:"
if [ -f "$PRE_COMMIT_HOOK" ]; then
  echo -e "  ${GREEN}✓${NC} pre-commit    - Validates code quality and secrets"
else
  echo -e "  ${RED}✗${NC} pre-commit    - Not installed"
fi

if [ -f "$COMMIT_MSG_HOOK" ]; then
  echo -e "  ${GREEN}✓${NC} commit-msg    - Validates commit message format"
else
  echo -e "  ${RED}✗${NC} commit-msg    - Not installed"
fi

echo ""

echo "Configuration:"
TEMPLATE=$(git config --local commit.template 2>/dev/null || echo "none")
echo "  Commit template: $TEMPLATE"
echo ""

echo -e "${GREEN}Next steps:${NC}"
echo "  1. Try a commit: git commit"
echo "  2. The template will auto-load with S-AOS format"
echo "  3. Hooks will validate before the commit is created"
echo ""

echo "Resources:"
echo "  • Template: .gitmessage"
echo "  • Examples: docs/governance/S-AOS_EXAMPLES_GOOD_VS_BAD.md"
echo "  • Bypass hooks (not recommended): git commit --no-verify"
echo ""

echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""

#!/usr/bin/env bash
# Interactive agent selection wizard

set -euo pipefail

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== Agent Selection Wizard ===${NC}\n"

echo "Answer these questions to select the optimal agent:"
echo ""

# Question 1: Multiple services?
read -p "Does this task affect multiple services? (y/n): " Q1
if [[ "$Q1" =~ ^[Yy]$ ]]; then
  echo -e "\n${GREEN}Recommended: Summit/IntelGraph Superprompt${NC}"
  echo "Reason: Multi-service architecture expertise required"
  exit 0
fi

# Question 2: CI/CD related?
read -p "Is this CI/CD or pipeline related? (y/n): " Q2
if [[ "$Q2" =~ ^[Yy]$ ]]; then
  echo -e "\n${GREEN}Recommended: CI/CD Superprompt${NC}"
  echo "Reason: Pipeline enforcement and provenance expertise"
  exit 0
fi

# Question 3: Live terminal?
read -p "Do you need immediate terminal execution? (y/n): " Q3
if [[ "$Q3" =~ ^[Yy]$ ]]; then
  echo -e "\n${GREEN}Recommended: Cursor/Warp${NC}"
  echo "Reason: Zero-friction devloop integration"
  exit 0
fi

# Question 4: Cross-file refactor?
read -p "Is this a cross-file refactoring task? (y/n): " Q4
if [[ "$Q4" =~ ^[Yy]$ ]]; then
  echo -e "\n${GREEN}Recommended: Jules/Gemini${NC}"
  echo "Reason: Cross-file schema harmonization"
  exit 0
fi

# Question 5: Critical code?
read -p "Is this critical, zero-error-tolerance code? (y/n): " Q5
if [[ "$Q5" =~ ^[Yy]$ ]]; then
  echo -e "\n${GREEN}Recommended: Codex${NC}"
  echo "Reason: Deterministic zero-error builds"
  exit 0
fi

# Default: Claude Code
echo -e "\n${GREEN}Recommended: Claude Code${NC}"
echo "Reason: Complex architectural reasoning with third-order inference"

#!/bin/bash

###############################################################################
# Pre-Commit Maintainability Quick Check
#
# This script performs a lightweight check of maintainability metrics on
# staged files before allowing a commit. It's designed to be fast (<5 seconds)
# and only check files that are about to be committed.
#
# Usage:
#   1. Manual: ./scripts/pre-commit-metrics.sh
#   2. As git hook: Link from .git/hooks/pre-commit
#   3. Via husky: Add to .husky/pre-commit
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
#   2 - Script error
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Thresholds
MAX_FILE_LINES=500
MAX_FUNCTION_LINES=100
MAX_COMPLEXITY=15
WARN_TODO_COUNT=5

# Counters
warnings=0
errors=0

echo -e "${BOLD}🔍 Pre-Commit Maintainability Check${NC}\n"

# Get list of staged JS/TS files
staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|jsx|ts|tsx)$' || true)

if [ -z "$staged_files" ]; then
    echo -e "${GREEN}✓ No JS/TS files to check${NC}"
    exit 0
fi

file_count=$(echo "$staged_files" | wc -l | tr -d ' ')
echo -e "${BLUE}📁 Checking $file_count staged file(s)...${NC}\n"

###############################################################################
# Check 1: File Size
###############################################################################

echo -e "${BOLD}1. Checking file sizes (max $MAX_FILE_LINES lines)...${NC}"

large_files=0
while IFS= read -r file; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file" | tr -d ' ')

        if [ "$lines" -gt $MAX_FILE_LINES ]; then
            echo -e "   ${RED}✗ $file${NC} - $lines lines (exceeds $MAX_FILE_LINES)"
            ((errors++))
            ((large_files++))
        elif [ "$lines" -gt $((MAX_FILE_LINES * 80 / 100)) ]; then
            echo -e "   ${YELLOW}⚠ $file${NC} - $lines lines (approaching limit)"
            ((warnings++))
        fi
    fi
done <<< "$staged_files"

if [ $large_files -eq 0 ]; then
    echo -e "   ${GREEN}✓ All files within size limits${NC}"
fi

echo ""

###############################################################################
# Check 2: TODO/FIXME Comments
###############################################################################

echo -e "${BOLD}2. Checking for technical debt markers...${NC}"

total_todos=0
total_fixmes=0

while IFS= read -r file; do
    if [ -f "$file" ]; then
        todos=$(grep -c "TODO" "$file" 2>/dev/null || echo 0)
        fixmes=$(grep -c "FIXME" "$file" 2>/dev/null || echo 0)

        total_todos=$((total_todos + todos))
        total_fixmes=$((total_fixmes + fixmes))

        if [ $((todos + fixmes)) -gt $WARN_TODO_COUNT ]; then
            echo -e "   ${YELLOW}⚠ $file${NC} - $todos TODOs, $fixmes FIXMEs"
            ((warnings++))
        fi
    fi
done <<< "$staged_files"

if [ $total_todos -eq 0 ] && [ $total_fixmes -eq 0 ]; then
    echo -e "   ${GREEN}✓ No technical debt markers found${NC}"
else
    echo -e "   ${BLUE}ℹ Found $total_todos TODOs and $total_fixmes FIXMEs${NC}"
fi

echo ""

###############################################################################
# Check 3: Long Functions (Basic Check)
###############################################################################

echo -e "${BOLD}3. Checking for long functions (max $MAX_FUNCTION_LINES lines)...${NC}"

long_functions=0

while IFS= read -r file; do
    if [ -f "$file" ]; then
        # Simple heuristic: Look for function declarations and count lines until closing brace
        # This is not perfect but provides a quick check

        # For JS/TS files, detect functions with many lines
        function_starts=$(grep -n "function\|const.*=.*=>\\|class.*{" "$file" 2>/dev/null || true)

        if [ -n "$function_starts" ]; then
            # Basic check: if file is very long, likely has long functions
            lines=$(wc -l < "$file" | tr -d ' ')
            function_count=$(echo "$function_starts" | wc -l | tr -d ' ')

            if [ "$function_count" -gt 0 ]; then
                avg_lines_per_function=$((lines / function_count))

                if [ "$avg_lines_per_function" -gt $MAX_FUNCTION_LINES ]; then
                    echo -e "   ${YELLOW}⚠ $file${NC} - Average function length: $avg_lines_per_function lines"
                    ((warnings++))
                    ((long_functions++))
                fi
            fi
        fi
    fi
done <<< "$staged_files"

if [ $long_functions -eq 0 ]; then
    echo -e "   ${GREEN}✓ No obviously long functions detected${NC}"
fi

echo ""

###############################################################################
# Check 4: Import Count (Coupling)
###############################################################################

echo -e "${BOLD}4. Checking import statements (coupling)...${NC}"

high_coupling=0
MAX_IMPORTS=20

while IFS= read -r file; do
    if [ -f "$file" ]; then
        import_count=$(grep -c "^import " "$file" 2>/dev/null || echo 0)

        if [ "$import_count" -gt $MAX_IMPORTS ]; then
            echo -e "   ${RED}✗ $file${NC} - $import_count imports (exceeds $MAX_IMPORTS)"
            ((errors++))
            ((high_coupling++))
        elif [ "$import_count" -gt $((MAX_IMPORTS * 75 / 100)) ]; then
            echo -e "   ${YELLOW}⚠ $file${NC} - $import_count imports (approaching limit)"
            ((warnings++))
        fi
    fi
done <<< "$staged_files"

if [ $high_coupling -eq 0 ]; then
    echo -e "   ${GREEN}✓ All files have reasonable import counts${NC}"
fi

echo ""

###############################################################################
# Check 5: Duplicate Code (Simple String Check)
###############################################################################

echo -e "${BOLD}5. Checking for obvious code duplication...${NC}"

duplicates_found=0

# Check for duplicate function names in the commit
function_names=$(while IFS= read -r file; do
    [ -f "$file" ] && grep -o "function [a-zA-Z_][a-zA-Z0-9_]*" "$file" 2>/dev/null | sed 's/function //' || true
done <<< "$staged_files" | sort)

duplicate_functions=$(echo "$function_names" | uniq -d)

if [ -n "$duplicate_functions" ]; then
    echo -e "   ${YELLOW}⚠ Duplicate function names found:${NC}"
    echo "$duplicate_functions" | while read -r funcname; do
        echo -e "      - $funcname"
        ((warnings++))
    done
    ((duplicates_found++))
fi

if [ $duplicates_found -eq 0 ]; then
    echo -e "   ${GREEN}✓ No obvious duplicates detected${NC}"
fi

echo ""

###############################################################################
# Summary
###############################################################################

echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}📊 Summary${NC}\n"

if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ All checks passed! Code quality looks good.${NC}\n"
    exit 0
fi

if [ $errors -gt 0 ]; then
    echo -e "${RED}✗ Errors: $errors${NC}"
fi

if [ $warnings -gt 0 ]; then
    echo -e "${YELLOW}⚠ Warnings: $warnings${NC}"
fi

echo ""

if [ $errors -gt 0 ]; then
    echo -e "${RED}${BOLD}❌ Commit blocked due to maintainability issues.${NC}"
    echo -e "${YELLOW}Please address the errors above before committing.${NC}\n"
    echo -e "To bypass this check (not recommended):"
    echo -e "  ${BLUE}git commit --no-verify${NC}\n"
    exit 1
else
    echo -e "${YELLOW}⚠ Commit allowed with warnings.${NC}"
    echo -e "${BLUE}Consider addressing the warnings above.${NC}\n"
    exit 0
fi

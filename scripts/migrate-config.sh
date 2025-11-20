#!/usr/bin/env bash
#
# Configuration Migration Helper
# Automates the migration from legacy configuration to unified config approach
#
# Usage: ./scripts/migrate-config.sh [--dry-run] [--environment dev|staging|prod]
#
# This script:
# 1. Backs up existing configuration files
# 2. Merges nested .env files into root
# 3. Removes duplicate keys (keeps last value)
# 4. Migrates deprecated keys to new names
# 5. Validates the result with Zod schema
#

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
ENVIRONMENT="dev"
BACKUP_DIR=".config-backup-$(date +%Y%m%d-%H%M%S)"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Deprecated key mappings (old_key=new_key)
declare -A DEPRECATED_KEYS=(
    ["NEO4J_USERNAME"]="NEO4J_USER"
    ["POSTGRES_URL"]="DATABASE_URL"
)

# Files to merge (in order of precedence - later files override earlier)
ENV_FILES_TO_MERGE=(
    "server/.env"
    ".env"
)

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --environment|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [--dry-run] [--environment dev|staging|prod]"
            echo ""
            echo "Options:"
            echo "  --dry-run          Show what would be done without making changes"
            echo "  --environment ENV  Specify environment (dev, staging, prod)"
            echo "  --help, -h         Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Backup existing configuration
backup_config() {
    log_info "Creating backup in $BACKUP_DIR"

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would create backup directory"
        return
    fi

    mkdir -p "$BACKUP_DIR"

    # Backup all .env files
    find . -maxdepth 3 -name ".env*" -not -path "./node_modules/*" -not -path "./$BACKUP_DIR/*" | while read -r file; do
        cp "$file" "$BACKUP_DIR/$(echo "$file" | tr '/' '_')"
    done

    # Backup config directory
    if [ -d "config" ]; then
        cp -r config "$BACKUP_DIR/"
    fi

    log_success "Backup created at $BACKUP_DIR"
}

# Merge .env files
merge_env_files() {
    log_info "Merging .env files into root .env"

    local temp_file="$ROOT_DIR/.env.merged.tmp"
    local output_file="$ROOT_DIR/.env"

    # Create associative array to track keys (keeps last value)
    declare -A env_vars
    declare -A env_comments
    local current_section=""

    # Read all env files in order
    for env_file in "${ENV_FILES_TO_MERGE[@]}"; do
        local full_path="$ROOT_DIR/$env_file"

        if [ ! -f "$full_path" ]; then
            log_warning "File not found: $env_file (skipping)"
            continue
        fi

        log_info "Reading $env_file"

        while IFS= read -r line || [ -n "$line" ]; do
            # Skip empty lines
            if [ -z "$line" ]; then
                continue
            fi

            # Track section comments
            if [[ "$line" =~ ^#.*====.*$ ]] || [[ "$line" =~ ^#.*----.*$ ]]; then
                current_section="$line"
                continue
            fi

            # Keep non-section comments
            if [[ "$line" =~ ^# ]]; then
                continue
            fi

            # Extract key=value
            if [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)= ]]; then
                local key="${BASH_REMATCH[1]}"
                local value="${line#*=}"

                # Check if key is deprecated
                if [ -n "${DEPRECATED_KEYS[$key]:-}" ]; then
                    local new_key="${DEPRECATED_KEYS[$key]}"
                    log_warning "Migrating deprecated key: $key → $new_key (from $env_file)"
                    key="$new_key"
                fi

                # Store the value (overwrites if duplicate)
                env_vars["$key"]="$value"

                # Track which section this key belongs to
                if [ -n "$current_section" ]; then
                    env_comments["$key"]="$current_section"
                fi
            fi
        done < "$full_path"
    done

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would write ${#env_vars[@]} unique keys to $output_file"

        # Show sample of what would be written
        log_info "Sample of merged keys (first 10):"
        local count=0
        for key in "${!env_vars[@]}"; do
            if [ $count -ge 10 ]; then break; fi
            echo "  $key=${env_vars[$key]}"
            ((count++))
        done

        return
    fi

    # Write merged file
    {
        echo "# ============================================================================"
        echo "# MERGED CONFIGURATION - Generated $(date)"
        echo "# This file was automatically generated by merge-config.sh"
        echo "# Original files backed up to: $BACKUP_DIR"
        echo "# ============================================================================"
        echo ""

        # Write all environment variables (sorted)
        for key in $(echo "${!env_vars[@]}" | tr ' ' '\n' | sort); do
            echo "$key=${env_vars[$key]}"
        done
    } > "$temp_file"

    # Move to final location
    mv "$temp_file" "$output_file"

    log_success "Merged ${#env_vars[@]} unique keys into $output_file"
}

# Remove nested .env files
remove_nested_env_files() {
    log_info "Removing nested .env files"

    local files_to_remove=(
        "server/.env"
        "server/.env.production"
        "server/.env.production.template"
        "server/.env.rehydrated"
        "server/.env.production.rehydrated"
    )

    for file in "${files_to_remove[@]}"; do
        local full_path="$ROOT_DIR/$file"

        if [ ! -f "$full_path" ]; then
            continue
        fi

        if [ "$DRY_RUN" = true ]; then
            log_warning "DRY RUN: Would remove $file"
        else
            # Mark as deprecated instead of deleting (safer)
            mv "$full_path" "$full_path.deprecated"
            log_success "Moved $file to $file.deprecated"
        fi
    done
}

# Validate merged configuration
validate_config() {
    log_info "Validating merged configuration"

    if [ ! -f "$ROOT_DIR/server/src/config.ts" ]; then
        log_warning "Config validator not found, skipping validation"
        return
    fi

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would validate config with Zod schema"
        return
    fi

    # Try to run the config validation
    cd "$ROOT_DIR/server" || exit 1

    if ! pnpm exec tsx -e "import { cfg } from './src/config'; console.log('✓ Config validation passed')"; then
        log_error "Configuration validation failed!"
        log_info "Please review the merged .env file and fix any issues"
        exit 1
    fi

    cd "$ROOT_DIR" || exit 1
    log_success "Configuration validation passed"
}

# Generate migration report
generate_report() {
    log_info "Generating migration report"

    local report_file="$BACKUP_DIR/migration-report.txt"

    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Would generate report at $report_file"
        return
    fi

    {
        echo "Configuration Migration Report"
        echo "==============================="
        echo "Date: $(date)"
        echo "Environment: $ENVIRONMENT"
        echo ""
        echo "Backup Location: $BACKUP_DIR"
        echo ""
        echo "Files Merged:"
        for file in "${ENV_FILES_TO_MERGE[@]}"; do
            echo "  - $file"
        done
        echo ""
        echo "Deprecated Keys Migrated:"
        for old_key in "${!DEPRECATED_KEYS[@]}"; do
            echo "  - $old_key → ${DEPRECATED_KEYS[$old_key]}"
        done
        echo ""
        echo "Files Deprecated:"
        echo "  - server/.env (→ .env.deprecated)"
        echo "  - server/.env.production (→ .env.production.deprecated)"
        echo ""
        echo "Next Steps:"
        echo "1. Review the merged .env file"
        echo "2. Test the application: pnpm dev"
        echo "3. If everything works, delete .deprecated files"
        echo "4. Update deployment scripts to use root .env"
        echo "5. Update team documentation"
    } > "$report_file"

    log_success "Migration report saved to $report_file"
}

# Main execution
main() {
    log_info "Starting configuration migration"
    log_info "Environment: $ENVIRONMENT"

    if [ "$DRY_RUN" = true ]; then
        log_warning "Running in DRY RUN mode - no changes will be made"
    fi

    echo ""

    # Step 1: Backup
    backup_config
    echo ""

    # Step 2: Merge env files
    merge_env_files
    echo ""

    # Step 3: Remove nested files
    remove_nested_env_files
    echo ""

    # Step 4: Validate
    validate_config
    echo ""

    # Step 5: Generate report
    generate_report
    echo ""

    if [ "$DRY_RUN" = true ]; then
        log_info "Dry run complete. Run without --dry-run to apply changes."
    else
        log_success "Migration complete!"
        log_info "Backup saved to: $BACKUP_DIR"
        log_info "Review the changes and test your application"
    fi
}

# Run main function
main

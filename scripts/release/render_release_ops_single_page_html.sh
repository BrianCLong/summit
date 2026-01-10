#!/usr/bin/env bash
# render_release_ops_single_page_html.sh v1.0.0
# Wrapper script for HTML rendering of release_ops_single_page.md
#
# Attempts to convert markdown to HTML using the Node.js renderer.
# If conversion fails, creates a minimal fallback HTML file.
#
# Authority: docs/ci/RELEASE_OPS_SINGLE_PAGE.md

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

# --- Logging ---
log_info() {
    echo "[INFO] $*" >&2
}

log_warn() {
    echo "[WARN] $*" >&2
}

log_error() {
    echo "[ERROR] $*" >&2
}

# --- Helper functions ---
print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Renders release_ops_single_page.md to HTML.

OPTIONS:
    --in FILE          Input markdown file (required)
    --out FILE         Output HTML file (required)
    --title TEXT       HTML page title (optional)
    --verbose          Enable verbose logging
    --help             Show this help message

EXAMPLES:
    $0 --in artifacts/release-train/release_ops_single_page.md \\
       --out artifacts/release-train/release_ops_single_page.html

    $0 --in summary.md --out summary.html --title "My Repo - Release Ops"
EOF
}

# Create minimal fallback HTML when render fails
create_fallback_html() {
    local input_file="$1"
    local output_file="$2"
    local title="$3"
    local error_message="${4:-Render failed}"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    cat > "${output_file}" <<FALLBACK_HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px 40px;
      line-height: 1.6;
    }
    .warning {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
    }
    pre {
      background: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>

  <div class="warning">
    <strong>HTML Render Warning</strong><br>
    ${error_message}. The markdown source is still available.
  </div>

  <h2>Markdown Source</h2>
  <p>Open <code>${input_file}</code> to view the full content.</p>

  <h2>Quick View</h2>
  <p>Below is the raw markdown content:</p>

  <pre><code>$(head -n 100 "${input_file}" 2>/dev/null || echo "Could not read input file")

[... truncated - see markdown file for full content ...]</code></pre>

  <footer style="margin-top: 2em; color: #666; font-size: 0.875em;">
    Generated: ${timestamp} (fallback mode)
  </footer>
</body>
</html>
FALLBACK_HTML

    log_warn "Created fallback HTML: ${output_file}"
}

# --- Main ---
main() {
    local input_file=""
    local output_file=""
    local title="Release Ops Single Page"
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --in)
                input_file="$2"
                shift 2
                ;;
            --out)
                output_file="$2"
                shift 2
                ;;
            --title)
                title="$2"
                shift 2
                ;;
            --verbose)
                verbose=true
                shift
                ;;
            --help)
                print_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done

    # Validate required arguments
    if [[ -z "${input_file}" ]]; then
        log_error "Missing required option: --in"
        exit 1
    fi
    if [[ -z "${output_file}" ]]; then
        log_error "Missing required option: --out"
        exit 1
    fi

    # Check input file exists
    if [[ ! -f "${input_file}" ]]; then
        log_error "Input file not found: ${input_file}"
        create_fallback_html "${input_file}" "${output_file}" "${title}" "Input file not found"
        exit 0  # Don't fail the workflow
    fi

    # Ensure output directory exists
    mkdir -p "$(dirname "${output_file}")"

    # Try Node.js renderer first
    local node_renderer="${SCRIPT_DIR}/render_release_ops_single_page_html.mjs"

    if [[ -f "${node_renderer}" ]]; then
        [[ "${verbose}" == "true" ]] && log_info "Using Node.js renderer"

        local node_args=("--in" "${input_file}" "--out" "${output_file}" "--title" "${title}")
        [[ "${verbose}" == "true" ]] && node_args+=("--verbose")

        if node "${node_renderer}" "${node_args[@]}"; then
            log_info "HTML render successful: ${output_file}"
            exit 0
        else
            log_warn "Node.js renderer failed, trying fallback"
        fi
    else
        [[ "${verbose}" == "true" ]] && log_info "Node.js renderer not found, trying fallback"
    fi

    # Try pandoc if available
    if command -v pandoc &> /dev/null; then
        [[ "${verbose}" == "true" ]] && log_info "Using pandoc"

        if pandoc \
            --from=gfm \
            --to=html5 \
            --standalone \
            --metadata="title:${title}" \
            --css="" \
            -o "${output_file}" \
            "${input_file}" 2>/dev/null; then
            log_info "HTML render successful (pandoc): ${output_file}"
            exit 0
        else
            log_warn "pandoc failed, using fallback"
        fi
    fi

    # Final fallback: create minimal HTML
    log_warn "All renderers failed, creating fallback HTML"
    create_fallback_html "${input_file}" "${output_file}" "${title}" "No renderer available"
    exit 0
}

main "$@"

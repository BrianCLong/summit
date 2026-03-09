# Evidence ID Consistency Gate - Operations Manual

## Purpose
The Evidence ID Consistency gate ensures that all `Evidence-IDs` referenced in governance documents have corresponding entries in the evidence registry, maintaining traceability and completeness of governance artifacts.

## Quick Start

### Installation
```bash
npm run ci:evidence-id-consistency
```

### Basic Operation
```bash
# Run with default settings (non-blocking, no AI features)
npm run ci:evidence-id-consistency -- --sha=$(git rev-parse HEAD)

# Run with AI analysis enabled (requires DASHSCOPE_API_KEY)
ENABLE_QWEN_ANALYSIS=true npm run ci:evidence-id-consistency

# Run with patch generation enabled
ENABLE_QWEN_PATCHES=true npm run ci:evidence-id-consistency
```

## Configuration Options

### Environment Variables
- `DASHSCOPE_API_KEY` - Required when enabling Qwen AI features
- `QWEN_MODEL` - Qwen model to use (default: `qwen-plus-2025-01-25`)
- `QWEN_BASE_URL` - Base URL for DashScope API (default: international endpoint)
- `ENABLE_QWEN_ANALYSIS` - Enable AI-assisted analysis (default: false)
- `ENABLE_QWEN_PATCHES` - Enable AI patch generation (default: false)
- `QWEN_PATCHES_FAIL_ON_HIGH` - Make high-severity patches cause build failure (default: false)
- `QWEN_CACHE_ENABLED` - Enable content-addressed caching (default: true)
- `QWEN_REPLAY_ONLY` - Force replay-only mode (default: true in CI)

### Command Line Arguments
- `--sha=<commit-sha>` - Specify commit SHA for artifact tagging
- `--output=<path>` - Override default output directory

## Operational Patterns

### Local Development
```bash
# Dry run to see what would be checked
npm run ci:evidence-id-consistency -- --sha=dev-$(date +%s)

# With debug logging
DEBUG=EVIDENCE npm run ci:evidence-id-consistency
```

### CI/CD Integration
```yaml
name: Governance / Evidence ID Consistency
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  evidence-id-consistency:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
      
    - name: Run Evidence ID Consistency Check
      run: npm run ci:evidence-id-consistency -- --sha=${{ github.sha }}
      
    - name: Upload Artifacts
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: evidence-id-consistency-${{ github.sha }}
        path: artifacts/governance/evidence-id-consistency/${{ github.sha }}/
```

### Advanced CI Patterns
```bash
# Run with AI analysis but non-blocking
ENABLE_QWEN_ANALYSIS=true npm run ci:evidence-id-consistency

# Run with AI patches and fail on high severity issues
ENABLE_QWEN_PATCHES=true QWEN_PATCHES_FAIL_ON_HIGH=true npm run ci:evidence-id-consistency
```

## Artifact Structure

### File Layout
```
artifacts/governance/evidence-id-consistency/<sha>/
├── report.json          # Core validation results (deterministic content)
├── report.md            # Human-readable summary
├── stamp.json           # Runtime metadata (timestamps, generator, exit status)
└── ai_patches/          # (when ENABLE_QWEN_PATCHES=true)
    ├── index.json       # Patch metadata and relationships
    ├── validation.json  # Patch applicability assessment
    ├── <patch-id>.patch # Individual unified diffs (RFC-compliant)
    └── bundle.patch     # Aggregated patches for bulk application
```

### Report Schema
```json
{
  "version": "1.0.0",
  "generator": "evidence-id-consistency-verifier",
  "status": "pass|fail",
  "sha": "<commit-sha>",
  "policy_hash": "<deterministic-policy-hash>",
  "source": "evidence-id-policy",
  "config": { /* configuration used */ },
  "totals": {
    "documents_checked": 5,
    "evidence_ids_found": 15,
    "evidence_ids_referenced": 12,
    "evidence_ids_registered": 10,
    "evidence_ids_orphaned": 2,
    "violations": 3,
    "errors": 1,
    "warnings": 2,
    "infos": 0
  },
  "results": [/* per-document validation results */],
  "metadata": {
    "summary": "Processed N documents...",
    "orphaned_ids": ["orphan.id1", "orphan.id2"],
    "recommendations": ["Fix all violations before merging"]
  }
}
```

## Security & Compliance

### Data Handling
- No sensitive content transmitted to AI providers without redaction
- Audit ledgers contain only hash references (no content)
- Content-addressed caching ensures reproducible builds
- File paths validated to prevent path traversal

### Credential Management
- API keys loaded from environment, never hardcoded
- Credentials excluded from logs and artifacts
- Replay-only mode prevents accidental network calls in CI

## Performance Characteristics

### Execution Times
- **Small repos** (< 50 docs): 20-40ms
- **Medium repos** (50-200 docs): 40-150ms
- **Large repos** (>200 docs): 150-500ms

### Memory Usage
- Peak usage: ~50MB for 200+ document repos
- Batch processing limits concurrent file operations
- File size limits prevent excessive memory consumption

### Scalability
- Parallel processing with configurable batch size (default: 10)
- Git integration for deterministic file ordering
- Cache hit rates >95% in CI environments

## Troubleshooting

### Common Issues

#### "Missing Evidence Mapping" 
- **Cause**: Governance document references an Evidence-ID not in registry
- **Solution**: Add the missing ID to `evidence/map.yml`

#### "Invalid Evidence ID Format"
- **Cause**: Evidence-ID doesn't match required pattern
- **Solution**: Use alphanumeric, hyphen, underscore, and dot format only

#### "File Size Exceeded"
- **Cause**: Document exceeds 10MB limit
- **Solution**: Reduce document size or exclude from governance scope

#### "Processing Error"
- **Cause**: Unreadable file, invalid YAML, or other processing issue
- **Solution**: Check file permissions and content validity

### Debugging

#### Enable Debug Output
```bash
EVIDENCE_DEBUG=true npm run ci:evidence-id-consistency
```

#### Analyze Artifacts
- Check `report.md` for human-readable summary
- Examine `report.json` for detailed violation data
- Review `stamp.json` for runtime metadata and exit status
- If using AI, check `ai_patches/` for suggested fixes

### Performance Optimization
- Use replay-only mode in CI for consistent performance
- Increase batch size for faster processing (higher memory usage)
- Validate evidence registry early in the process

## Maintenance & Updates

### Cache Management
- Regular cache cleanup to prevent disk usage growth
- Versioned cache keys to handle policy/schema changes
- Cache warming strategies for production environments

### Policy Evolution
- Version-lock prompt and schema changes to prevent semantic drift
- Test policy changes with golden test fixtures
- Document breaking changes with migration guides

## Rollback Procedures

### Immediate Disable
Set environment variables to disable features:
```bash
ENABLE_QWEN_ANALYSIS=false ENABLE_QWEN_PATCHES=false npm run ci:evidence-id-consistency
```

### Complete Removal
Remove the gate from CI configuration and delete:
- `artifacts/governance/evidence-id-consistency/` directory
- Evidence registry at `evidence/map.yml` (if not needed by other tools)
- Entry from `package.json` npm scripts

## Support Matrix

| Environment | Supported | Notes |
|-------------|-----------|-------|
| Node.js 18+ | ✅ | Primary runtime |
| Node.js 16-17 | ⚠️ | May work but not tested |
| Windows | ✅ | With Unix-style path handling |
| macOS | ✅ | Primary development platform |
| Linux | ✅ | Primary CI platform |

## Escalation Path

1. **Tier 1**: Check documentation and known issues
2. **Tier 2**: Contact #governance-team with reproduction steps
3. **Tier 3**: For production outages, tag @governance-emergency

## Version History

### v1.3.0 - Qwen Patches GA
- Added OpenAI-compatible Qwen integration via DashScope
- Implemented deterministic caching with SHA-256 keys
- Added content-addressed storage preventing nondeterminism
- Introduced AI patch generation with RFC-compliant unified diffs
- Enhanced security with PII/secret redaction

### v1.2.0 - Governance Foundation
- Core Evidence-ID validation and registry synchronization
- Deterministic document processing and reporting
- Initial CI/CD integration patterns

### v1.0.0 - MVP Release
- Basic Evidence-ID format validation
- Governance document scanning
- Initial reporting capability

For questions about this document, contact the governance team.
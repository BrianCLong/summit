# Evidence ID Consistency Gate - Integration Guide

## For Platform Teams

### Adding to Your Repo

To integrate the Evidence ID Consistency gate into your repository:

1. **Install the dependency** (if using as package):
```bash
npm install @summit/evidence-id-gate --save-dev
```

OR

**Copy the script directly** (recommended for monorepos):
```bash
# Copy the scripts to your project
cp -r scripts/ci/verify_evidence_id_consistency.mjs scripts/ci/evidence-id-consistency.mjs
cp -r scripts/ci/ai-providers/ scripts/ci/ai-providers/
```

2. **Update package.json**:
```json
{
  "scripts": {
    "ci:evidence-id-consistency": "node scripts/ci/verify_evidence_id_consistency.mjs"
  }
}
```

3. **Create your evidence registry** at `evidence/map.yml`:
```yaml
# evidence/map.yml - Define your evidence artifacts
platform-security-audit:
  path: "artifacts/security/audit/${sha}/report.json"
  description: "Platform security audit results"
  generator: "security-audit-tool"

docs-integrity-check:
  path: "artifacts/governance/docs-integrity/${sha}/stamp.json"
  description: "Documentation integrity verification results"
  generator: "docs-verifier"

dependency-scan:
  path: "artifacts/security/dependency-scan/${sha}/results.json"
  description: "Dependency vulnerability scan results"
  generator: "dependency-scanner"
```

### Adding to CI Pipeline

#### GitHub Actions
```yaml
name: Governance / Evidence ID Consistency
on:
  push:
    branches: [main, develop, release/**]
  pull_request:
    branches: [main]

jobs:
  evidence-check:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
      with:
        fetch-depth: 0  # Required for git-based file discovery

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci
      
    - name: Run Evidence ID Consistency Check
      run: npm run ci:evidence-id-consistency -- --sha=${{ github.sha }}

    - name: Upload Evidence Artifacts
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: evidence-id-consistency-${{ github.sha }}
        path: artifacts/governance/evidence-id-consistency/${{ github.sha }}/
        retention-days: 30
```

#### Jenkins Pipeline
```groovy
stage('Evidence ID Consistency') {
  steps {
    script {
      def nodeVersion = '18'
      def sha = env.GIT_COMMIT ?: 'manual'
      
      sh """
        npm run ci:evidence-id-consistency -- --sha=${sha}
      """
    }
  }
  post {
    always {
      archiveArtifacts artifacts: 'artifacts/governance/evidence-id-consistency/*/**', fingerprint: true
    }
  }
}
```

## For Governance Teams

### Setting Up Evidence Registry

The evidence registry maps Evidence-IDs to their actual locations:

```yaml
# evidence/map.yml
governance-docs-integrity:
  path: "artifacts/governance/docs-integrity/${sha}/stamp.json"
  description: "Documentation integrity verification results"
  generator: "governance_docs_verifier"
  created_at: "2026-01-14"
  last_validated: "2026-01-14"
  owner: "Platform Engineering"

branch-protection-drift:
  path: "artifacts/governance/branch-protection-drift/stamp.json"
  description: "Branch protection drift detection results" 
  generator: "branch_protection_checker"
  created_at: "2026-01-14"
  last_validated: "2026-01-14"
  owner: "Security Team"

soc-compliance-report:
  path: "soc-compliance-reports/${sha}.json"
  description: "SOC 2 compliance verification report"
  generator: "soc_verification_tool"
  created_at: "2026-01-14"
  last_validated: "2026-01-14"
  owner: "Compliance Team"
```

### Required Document Headers

Each governance document must include these headers in the first 30 lines:

```markdown
# Document Title

**Owner:** Platform Engineering  
**Last-Reviewed:** 2026-01-14
**Evidence-IDs:** governance-docs-integrity,branch-protection-drift,soc-compliance-report
**Status:** active

## Content
...
```

### Evidence ID Format

Evidence-IDs must follow the format: `^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*$`

**Valid Examples:**
- `governance-docs-integrity`
- `branch-protection.drift.monitoring`  
- `soc-compliance.report.v1`

**Invalid Examples:**
- `Evidence with Spaces` (no spaces)
- `evidence@invalid` (special chars except dash/underscore/dot)
- `123-invalid-start` (shouldn't start with numbers, per convention)

## For Security Teams

### Security Controls Implemented

The gate includes these security measures:

1. **PII/Secret Redaction**: Content is filtered before sending to AI
2. **Network Isolation**: Replay-only mode disables network calls by default
3. **Path Validation**: No path traversal vulnerabilities allowed
4. **Content Addressing**: SHA-256 keys for deterministic caching
5. **Audit Logging**: Hash-only trails without content leakage

### Compliance Checks

The gate addresses these compliance requirements:
- **SOX**: Evidence traceability for regulatory compliance
- **SOC2**: Continuous monitoring of evidence integrity
- **ISO27001**: Systematic evidence management
- **GDPR**: PII handling controls in AI preprocessing

### Risk Mitigation

- **No Content Leakage**: Audit trails contain only hashes
- **Controlled AI Access**: API keys restricted to specific environments
- **Deterministic Behavior**: Reproducible verification results
- **Non-Breaking by Default**: Fails open unless explicitly configured to fail

## For DevOps Teams

### Monitoring Setup

#### Health Checks
```bash
# Verify gate is responding
curl -s http://localhost:3000/health | jq '.gates["evidence-id-consistency"].status'

# Check latest run results
cat artifacts/governance/evidence-id-consistency/latest/stamp.json
```

#### Metrics Collection
The gate outputs these metrics:
- `evidence_id_gate_duration_seconds` - Execution time
- `evidence_id_gate_documents_total` - Docs processed
- `evidence_id_gate_violations_total` - Violations found
- `evidence_id_gate_errors_total` - Processing errors
- `evidence_id_gate_warnings_total` - Processing warnings

#### Performance Tuning
```bash
# Adjust for large repos
MAX_CONCURRENT_FILES=20 npm run ci:evidence-id-consistency

# For small repos, maximize parallelism
MAX_CONCURRENT_FILES=5 npm run ci:evidence-id-consistency
```

### Caching Strategy

#### Cache Location
By default, cache is stored at `.qwen-cache/` but can be overridden:
```bash
QWEN_CACHE_DIR=/shared/cache/qwen npm run ci:evidence-id-consistency
```

#### Cache Warming
Pre-populate cache for new environments:
```bash
# Record mode (generates cache entries)
ALLOW_QWEN_RECORD_IN_CI=true npm run ci:evidence-id-consistency
```

#### Cache Maintenance
Regular cleanup jobs:
```bash
# Clean old cache entries (older than 30 days)
find .qwen-cache/ -name "*.json" -mtime +30 -delete
```

## For AI/ML Teams

### Prompt Management

#### Versioning Policy
- Prompts use semantic versioning: `prompt-name-v1.2.3`
- Breaking changes increment major version
- New features increment minor version
- Bug fixes increment patch version

#### Custom Prompt Templates
Create custom prompts in `scripts/ci/ai-providers/prompts/`:
```handlebars
{{!-- custom-evidence-check-v1.0.prompt.hbs --}}
You are a compliance expert verifying Evidence-IDs in documents.
Validate that each Evidence-ID exists in the registry: {{registry}}

Document Content: {{document}}
Analysis Task: {{task}}

Return results in JSON format: { "issues": [] }
```

#### AI Provider Configuration
```bash
# Switch to different provider
QWEN_BASE_URL=https://your-own-endpoint.com/compatible-mode/v1
QWEN_MODEL=qwen-max-2025-01-25
DASHSCOPE_API_KEY=your-key-here
```

## Best Practices

### For Document Authors
- Use consistent Evidence-ID naming conventions
- Reference only registered Evidence-IDs
- Include `Evidence-IDs: none` for docs that don't need evidence
- Update `Last-Reviewed` date regularly

### For Governance Maintainers
- Keep evidence registry current with active artifacts  
- Use semantic versioning for breaking changes
- Review orphaned Evidence-IDs regularly
- Document the purpose of each Evidence-ID

### For Platform Engineers
- Monitor cache hit rates (>95% ideal)
- Track performance metrics over time
- Validate determinism regularly in CI
- Set up alerts for critical violations

## Common Workflows

### Adding New Evidence
1. Create the evidence artifact at its specified path
2. Add entry to `evidence/map.yml` 
3. Update any governance documents that should reference it
4. Run the gate to verify consistency

### Deprecating Evidence
1. Update governance documents to remove references
2. Remove entry from `evidence/map.yml`
3. Optionally add deprecation notice to registry
4. Run orphaned ID checks to confirm removal

### Troubleshooting Drift
1. Run gate locally with `--debug` flag
2. Check `report.json` for detailed violations
3. Examine `stamp.json` for runtime metadata
4. Review `ai_patches/bundle.patch` for suggested fixes (if enabled)

## Migration Strategies

### From Manual Checks
1. Run both manual and automated checks in parallel
2. Compare results to ensure coverage parity
3. Gradually phase out manual processes
4. Retain manual checks for complex scenarios

### From Other Systems
1. Export existing evidence registry to YAML format
2. Map to the gate's schema requirements
3. Run gate in reporting mode first
4. Address discrepancies before enforcing

For integration support, contact the governance team or reference the full operations manual.
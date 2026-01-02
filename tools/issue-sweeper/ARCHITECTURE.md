# Issue Sweeper - Architecture & Design

## System Overview

The Issue Sweeper is a **scalable, autonomous issue resolution system** designed to process 10,000+ GitHub issues with:

- **Evidence-based decision making** - No action without proof
- **Batch processing** - Handles unlimited scale via pagination
- **Checkpoint resumability** - Never lose progress
- **Automated fixing** - Implements common patterns automatically
- **PR automation** - Creates, labels, and links PRs
- **Comprehensive auditing** - Full trail in LEDGER.ndjson

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Issues API                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Fetch issues (paginated)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Main Runner                             │
│                     (run.ts)                                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Batch Loop (configurable size)                       │  │
│  │  - Load STATE.json                                     │  │
│  │  - Fetch next batch                                    │  │
│  │  - Process each issue                                  │  │
│  │  - Save checkpoint                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ For each issue
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Issue Processor                           │
│                   (lib/processor.ts)                         │
│                                                              │
│  1. Classify issue (bug, feature, docs, etc.)               │
│  2. Search for evidence (PRs, commits, tests)               │
│  3. Decision pipeline:                                       │
│     ├─ Already solved? → Comment + Close                    │
│     ├─ Blocked? → Mark + Log                                │
│     └─ Actionable? → Attempt fix                            │
│                                                              │
│  Options: autoFix, autoPR, skipVerification                 │
└─────┬───────────────────────────┬────────────┬──────────────┘
      │                           │            │
      │ Classify                  │ Evidence   │ Fix
      ▼                           ▼            ▼
┌─────────────┐          ┌──────────────┐   ┌──────────────┐
│ Classifier  │          │   Evidence   │   │    Fixer     │
│             │          │   Searcher   │   │              │
│ - Keywords  │          │              │   │ - TypeScript │
│ - Labels    │          │ - PR search  │   │ - Linting    │
│ - Patterns  │          │ - Git log    │   │ - Imports    │
│             │          │ - Tests      │   │ - Docs       │
└─────────────┘          └──────────────┘   │ - CI/CD      │
                                            └──────┬───────┘
                                                   │
                                                   │ Verify fix
                                                   ▼
                                            ┌──────────────┐
                                            │  Verifier    │
                                            │              │
                                            │ - Typecheck  │
                                            │ - Lint       │
                                            │ - Tests      │
                                            │ - Build      │
                                            └──────┬───────┘
                                                   │
                                                   │ If passed
                                                   ▼
                                            ┌──────────────┐
                                            │ PR Automation│
                                            │              │
                                            │ - Create PR  │
                                            │ - Link issue │
                                            │ - Add labels │
                                            └──────────────┘
```

## Core Modules

### 1. Main Runner (`run.ts`)

**Responsibility:** Orchestrate the batch processing loop

**Key Functions:**
- Parse CLI arguments
- Load/save STATE.json
- Fetch issues via GitHub API
- Process each issue
- Update statistics
- Generate reports

**CLI Options:**
```typescript
{
  batchSize: number,        // Issues per batch
  maxBatches: number,       // Stop after N batches
  dryRun: boolean,          // Simulate without changes
  autoFix: boolean,         // Enable automated fixing
  autoPR: boolean,          // Create PRs for fixes
  skipVerification: boolean // Skip typecheck/lint
}
```

---

### 2. Issue Processor (`lib/processor.ts`)

**Responsibility:** Core decision pipeline for each issue

**Algorithm:**
```
function processIssue(issue, options):
  1. classification = classifyIssue(issue)
  2. existingPR = findExistingPR(issue.number)
  3. if existingPR:
       return already_solved
  4. evidence = searchForEvidence(issue)
  5. if evidence.isSolved:
       commentWithEvidence(issue, evidence)
       closeIssue(issue)
       return already_solved
  6. if classification == "question" || "security":
       return blocked
  7. if options.autoFix:
       fixResult = attemptFix(issue, classification)
       if fixResult.success:
         verifyResult = runVerification()
         if verifyResult.passed:
           commitFix(issue, fixResult.changes)
           if options.autoPR:
             prURL = createPullRequest(...)
             linkPRToIssue(issue, prURL)
             return solved_in_this_run
  8. return not_solved
```

**Outputs:**
```typescript
{
  issue: GitHubIssue,
  classification: IssueClassification,
  solved_status: SolvedStatus,
  evidence: Evidence,
  actions: string[],
  pr_url?: string
}
```

---

### 3. Classifier (`lib/classifier.ts`)

**Responsibility:** Categorize issues by type

**Classification Logic:**
```
Priority 1: Labels (most reliable)
  - security, bug, feature, docs, question, ci, perf, refactor

Priority 2: Title/body keywords
  - TypeScript patterns → bug
  - "add", "implement" → feature
  - "documentation" → docs
  - "how to", "help" → question
  - etc.

Priority 3: Default
  - unknown
```

**Output:** `IssueClassification`

---

### 4. Evidence Searcher (`lib/evidence.ts`)

**Responsibility:** Find proof of resolution

**Search Strategy:**
```
1. GitHub API: Search for PRs mentioning issue number
   - Filter to merged PRs only
   - Return PR URLs

2. Git history: Search commits for issue number
   - git log --grep="#N" --oneline
   - Return commit hashes

3. Fallback: If issue is closed but no evidence
   - Mark as "closed without clear evidence"
   - May be invalid/duplicate/wontfix

4. Extract file paths from issue body
   - Regex for backtick-quoted paths
   - "File:" prefix patterns
   - Full path patterns

5. Verify files exist
   - test -f <path>
```

**Output:**
```typescript
{
  isSolved: boolean,
  evidence: {
    commits: string[],
    prs: string[],
    files: string[],
    notes: string
  }
}
```

---

### 5. Fixer (`lib/fixer.ts`)

**Responsibility:** Implement automated fixes

**Fix Patterns:**

#### Pattern 1: TypeScript Errors
```typescript
- Add missing type annotations (function params)
- Add .js extensions to ESM imports
- Fix common type issues
- Run: pnpm typecheck
```

#### Pattern 2: Linting Errors
```typescript
- Run: pnpm lint --fix
- Verify: pnpm lint
```

#### Pattern 3: Import/Dependency Errors
```typescript
- Detect missing package from error message
- Install: pnpm add <package>
- Verify: pnpm typecheck
```

#### Pattern 4: Documentation
```typescript
- Create placeholder docs for missing files
- Flag outdated docs (requires manual update)
```

#### Pattern 5: CI/CD
```typescript
- Validate YAML syntax
- Check workflow files
```

**Fix Workflow:**
```
1. Create branch: issue/<number>-<slug>
2. Apply fix
3. Verify (unless --skip-verification)
4. Commit with message: "fix: resolve issue #N - <title>"
5. Return: { success, changes, verification_command, branch_name }
```

---

### 6. Verifier (`lib/verifier.ts`)

**Responsibility:** Ensure fixes pass quality gates

**Verification Levels:**

#### Quick Verification (default)
```bash
pnpm typecheck
pnpm lint
```

#### Full Verification
```bash
pnpm typecheck
pnpm lint
pnpm test:quick
```

#### File-Specific Verification
```bash
pnpm typecheck  # All TS files
pnpm eslint <file1> <file2> ...
```

#### Build Verification (optional)
```bash
pnpm build
```

**Output:**
```typescript
{
  passed: boolean,
  checks: Array<{
    name: string,
    passed: boolean,
    output?: string,
    duration?: number
  }>,
  summary: string
}
```

---

### 7. PR Automation (`lib/pr-automation.ts`)

**Responsibility:** Create and manage pull requests

**PR Creation Workflow:**
```
1. Push branch to remote
   git push -u origin issue/<number>-<slug>

2. Create PR via GitHub API
   POST /repos/:owner/:repo/pulls
   {
     title: "Fix #N: <title>",
     body: <generated>,
     head: "issue/<number>-<slug>",
     base: "main"
   }

3. Add labels
   POST /repos/:owner/:repo/issues/:number/labels
   { labels: ["automated-fix", "issue-sweeper"] }

4. Link PR to issue
   POST /repos/:owner/:repo/issues/:number/comments
   { body: "🔗 Automated Fix Available: <pr_url>" }
```

**PR Body Template:**
```markdown
## 🤖 Automated Fix for Issue #N

### Original Issue
**Title:** <title>
**Link:** <url>

### Changes Made
- Change 1
- Change 2

### Verification
```bash
pnpm typecheck && pnpm lint
```

### Testing Checklist
- [ ] TypeScript compilation passes
- [ ] Linting passes
- [ ] Tests pass
- [ ] Build succeeds

### Issue Resolution
Closes #N

---
*Automated by issue-sweeper*
```

**Functions:**
- `createPullRequest()` - Create PR via API
- `findExistingPR()` - Check for duplicates
- `linkPRToIssue()` - Add comment
- `getCurrentBranch()` - Get current branch
- `switchToMainBranch()` - Return to main
- `deleteLocalBranch()` - Cleanup

---

### 8. State Manager (`lib/state.ts`)

**Responsibility:** Persist progress and enable resumability

**STATE.json Schema:**
```typescript
{
  cursor: number,               // Current page number
  last_issue_number: number,    // Last processed issue
  batch_size: number,           // Issues per batch
  run_started_at: string | null,
  run_updated_at: string | null,
  open_prs: string[],           // Created PR URLs
  failures: Array<{
    issue: number,
    reason: string
  }>,
  total_processed: number,
  stats: {
    already_solved: number,
    solved_in_this_run: number,
    not_solved: number,
    blocked: number,
    duplicate: number,
    invalid: number
  }
}
```

**Functions:**
- `loadState()` - Read from disk
- `saveState()` - Write to disk (after each batch)
- `appendLedger()` - Append entry to LEDGER.ndjson
- `readLedger()` - Load all entries
- `updateStats()` - Increment counters

---

### 9. Reporter (`lib/reporter.ts`)

**Responsibility:** Generate human-readable reports

**Report Sections:**
1. Metadata (generated time, started, updated)
2. Summary (total processed, batches)
3. Statistics (counts by status)
4. Progress (cursor, last issue, batch size)
5. PRs Opened (list of URLs)
6. Recent Failures (last 10)
7. Top Recurring Themes (classification counts)
8. Classification Breakdown (classification × status)
9. Next Steps (actionable items)

**Update Frequency:** After each batch

---

### 10. GitHub Client (`lib/github.ts`)

**Responsibility:** Abstract GitHub API interactions

**Features:**
- Token-based authentication
- Rate limit detection and handling
- Pagination support
- Error handling with retry logic

**API Methods:**
- `fetchIssues(page, perPage, state)`
- `searchPRsForIssue(issueNumber)`
- `searchPRsByKeywords(keywords)`
- `getIssue(issueNumber)`
- `createComment(issueNumber, body)`
- `closeIssue(issueNumber)`
- `addLabels(issueNumber, labels)`
- `getRateLimit()`

---

## Data Flow

### 1. Scan Mode (--batch-size=N)
```
GitHub API → Fetch issues
  ↓
Classifier → Categorize
  ↓
Evidence Searcher → Find existing fixes
  ↓
Already solved? → Comment + Close
  ↓
Not solved? → Mark as not_solved
  ↓
Ledger + Report
```

### 2. Auto-Fix Mode (--auto-fix)
```
GitHub API → Fetch issues
  ↓
Classifier → Categorize
  ↓
Evidence Searcher → Find existing fixes
  ↓
Already solved? → Comment + Close
  ↓
Actionable? → Fixer → Apply fix
  ↓
Verifier → Check typecheck + lint
  ↓
Passed? → Commit to feature branch
  ↓
Ledger + Report
```

### 3. Full Automation (--auto-fix --auto-pr)
```
GitHub API → Fetch issues
  ↓
Classifier → Categorize
  ↓
Evidence Searcher → Find existing fixes
  ↓
Already solved? → Comment + Close
  ↓
Actionable? → Fixer → Apply fix
  ↓
Verifier → Check typecheck + lint
  ↓
Passed? → Commit to feature branch
  ↓
PR Automation → Create PR + Link to issue
  ↓
Ledger + Report
```

---

## Scalability Considerations

### Batch Processing
- **Small batches (10-25):** Safer, frequent checkpoints, easier to debug
- **Large batches (50-100):** Faster throughput, less API overhead
- **Trade-off:** Larger batches risk more work loss on failure

### Rate Limits
- **Authenticated:** 5,000 requests/hour
- **Unauthenticated:** 60 requests/hour
- **Strategy:** Always use GITHUB_TOKEN

### Memory Usage
- **LEDGER.ndjson:** Streaming format, O(1) memory
- **STATE.json:** O(1) memory
- **Issues in batch:** O(N) where N = batch_size

### Resumability
- **Checkpoint after each batch**
- **Idempotent operations** (duplicate PR detection, etc.)
- **No data loss** on interruption

---

## Security & Safety

### No Secrets in Commits
- Never commit .env, credentials.json, etc.
- Warn user if such files detected

### Rate Limit Respect
- Automatic backoff on 403
- Wait until reset time
- Never spam API

### Branch Isolation
- Each fix in its own branch
- Never push to main directly
- Rollback on verification failure

### Verification Required
- No PR without passing typecheck + lint (unless --skip-verification)
- User can override with flag

### Audit Trail
- Every action logged in LEDGER.ndjson
- Immutable append-only log
- Full provenance

---

## Extension Points

### 1. Add Custom Fix Pattern
Edit `lib/fixer.ts`:
```typescript
async function fixCustomPattern(issue: GitHubIssue): Promise<FixResult> {
  // Your logic here
  return { success: true, changes: [...], verification_command: '...' };
}

// In fixBug():
if (title.includes('my-pattern')) {
  return await fixCustomPattern(issue);
}
```

### 2. Add Custom Classification
Edit `lib/classifier.ts`:
```typescript
if (labels.some((l) => l.includes('my-label'))) {
  return 'my-custom-type';
}
```

### 3. Add Custom Verification
Edit `lib/verifier.ts`:
```typescript
export async function runCustomVerification(): Promise<VerificationResult> {
  // Your checks here
}
```

### 4. Change PR Template
Edit `lib/pr-automation.ts` → `generatePRBody()`

---

## Performance Benchmarks

### Typical Performance
- **Scan mode:** ~2-3 seconds per issue (API calls, git search)
- **Auto-fix mode:** ~10-15 seconds per issue (fix + verify)
- **Auto-PR mode:** ~15-20 seconds per issue (PR creation)

### Bottlenecks
1. **GitHub API latency:** ~500ms per request
2. **TypeScript compilation:** ~5-10s for full repo
3. **Linting:** ~2-3s for full repo
4. **Git operations:** <1s each

### Optimization Strategies
1. **Parallel processing:** Run multiple sweepers on different issue ranges
2. **Caching:** Cache issue metadata locally
3. **Incremental compilation:** Only typecheck changed files
4. **GraphQL:** Replace REST API calls with batched GraphQL

---

## Testing Strategy

### Unit Tests (Future)
- Classifier: Issue → Classification
- Evidence Searcher: Mock git/API
- Fixer: Apply fixes to test files
- Verifier: Mock subprocess output

### Integration Tests (Future)
- Full pipeline with mock GitHub API
- Test STATE persistence
- Test resumability

### Current Testing
- Mock data in `lib/mock-data.ts`
- Local test script: `test-local.ts`
- Manual smoke testing

---

## Limitations & Future Work

### Current Limitations
1. **Single-threaded:** Processes one issue at a time
2. **Simple patterns:** Fixes only common issues
3. **No ML:** Classification is keyword-based
4. **No context:** Doesn't understand code semantics

### Future Enhancements
1. **Parallel processing:** Distribute across workers
2. **AI-powered fixing:** Use LLM for complex fixes
3. **Context-aware:** AST parsing, type inference
4. **Learning:** Learn from past fixes
5. **Metrics:** Track fix success rate, CI pass rate
6. **Dashboard:** Web UI for progress monitoring

---

## License

MIT (same as parent repository)

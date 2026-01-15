# Release Changelog Generator

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Release Changelog Generator automatically creates changelogs from commits between releases. It parses conventional commits, categorizes changes, and generates formatted release notes.

### Key Properties

- **Conventional commits**: Parses standard commit prefixes (feat, fix, etc.)
- **Automatic categorization**: Groups changes by type with emoji markers
- **PR integration**: Links to pull requests when available
- **Multiple formats**: Markdown and JSON output options

---

## Conventional Commits

The generator expects conventional commit format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Supported Types

| Type          | Category      | Emoji |
| ------------- | ------------- | ----- |
| `feat`        | Features      | ✨    |
| `fix`         | Bug Fixes     | 🐛    |
| `security`    | Security      | 🔒    |
| `perf`        | Performance   | ⚡    |
| `docs`        | Documentation | 📚    |
| `refactor`    | Refactoring   | ♻️    |
| `test`        | Tests         | 🧪    |
| `build`, `ci` | Build & CI    | 🔧    |
| `deps`        | Dependencies  | 📦    |

### Breaking Changes

Indicated by `!` after type or `BREAKING CHANGE` in footer:

```
feat!: remove deprecated API endpoint

BREAKING CHANGE: The /v1/legacy endpoint has been removed
```

---

## Example Output

```markdown
## [v4.2.0] - 2026-01-08

### 💥 Breaking Changes

- Remove deprecated legacy API endpoint ([#456](link)) - @developer

### ✨ Features

- Add user dashboard analytics ([#445](link)) - @developer
- Implement dark mode toggle ([#442](link)) - @designer

### 🐛 Bug Fixes

- Fix login redirect loop ([#448](link)) - @developer
- Resolve memory leak in cache service ([#447](link)) - @developer

### 🔒 Security

- Upgrade dependencies for CVE-2026-1234 ([#450](link)) - @security-team

### 👥 Contributors

@developer, @designer, @security-team

**Full Changelog**: https://github.com/org/repo/compare/v4.1.0...v4.2.0
```

---

## Automatic Triggers

| Trigger         | Action                           |
| --------------- | -------------------------------- |
| Tag push (`v*`) | Generate for new tag vs previous |
| Release created | Generate and attach to release   |
| Manual dispatch | Custom ref range                 |

---

## Usage

### Via GitHub Actions UI

1. Navigate to Actions → Generate Changelog
2. Click "Run workflow"
3. Configure options:
   - `from_ref`: Starting tag/commit (optional)
   - `to_ref`: Ending tag/commit (default: HEAD)
   - `prepend`: Add to CHANGELOG.md
   - `dry_run`: Preview without writing
4. Click "Run workflow"

### Via CLI

```bash
# Generate for latest tag to HEAD
./scripts/release/generate_changelog.sh

# Specify refs
./scripts/release/generate_changelog.sh \
  --from v4.1.0 \
  --to v4.2.0

# Prepend to CHANGELOG.md
./scripts/release/generate_changelog.sh --prepend

# Dry run
./scripts/release/generate_changelog.sh --dry-run

# Custom output file
./scripts/release/generate_changelog.sh --out /tmp/notes.md

# JSON format
./scripts/release/generate_changelog.sh --format json
```

---

## Configuration

### Policy File

Configure in `docs/ci/CHANGELOG_POLICY.yml`:

```yaml
format:
  output: markdown
  include_hashes: true
  include_pr_links: true
  include_authors: true
  group_by_category: true

categories:
  - name: "Features"
    emoji: "✨"
    patterns:
      - "^feat"
    priority: 2

exclude:
  patterns:
    - "^Merge branch"
    - "\\[skip changelog\\]"
  authors:
    - "dependabot[bot]"

output:
  prepend_to_file: true
  changelog_file: "CHANGELOG.md"
```

### Adding Categories

```yaml
categories:
  - name: "My Category"
    emoji: "🎯"
    patterns:
      - "^mycategory"
      - "^custom"
    priority: 5
```

### Excluding Commits

```yaml
exclude:
  patterns:
    - "^WIP:"
    - "\\[skip changelog\\]"
    - "^fixup!"
  authors:
    - "bot-account"
```

---

## Commit Filtering

### Included

- All commits matching conventional format
- Commits with PR references
- Commits from human contributors

### Excluded

- Merge commits
- Release commits (`chore(release):`)
- CI automation (`[skip ci]`)
- Work in progress (`WIP:`)
- Bot commits (dependabot, github-actions)

---

## PR Integration

When a commit references a PR:

```
feat(api): add new endpoint (#123)
```

The generator:

1. Extracts PR number (#123)
2. Creates link to PR
3. Can optionally fetch PR title/labels

---

## CHANGELOG.md Management

### Prepend Mode

With `--prepend`, new entries are added to top of CHANGELOG.md:

```markdown
# Changelog

## [v4.2.0] - 2026-01-08

[New entries here]

## [v4.1.0] - 2026-01-01

[Previous entries preserved]
```

### Artifact Mode

Without `--prepend`, generates standalone release notes:

- Output: `artifacts/release-train/release-notes.md`
- Attached to GitHub release
- Available as workflow artifact

---

## State Tracking

State in `docs/releases/_state/changelog_state.json`:

```json
{
  "version": "1.0.0",
  "last_generated": "2026-01-08T12:00:00Z",
  "last_from_tag": "v4.1.0",
  "last_to_tag": "v4.2.0",
  "generation_history": [
    {
      "timestamp": "2026-01-08T12:00:00Z",
      "from": "v4.1.0",
      "to": "v4.2.0",
      "output": "CHANGELOG.md"
    }
  ]
}
```

---

## Best Practices

### For Developers

1. **Use conventional commits** - Follow `type(scope): description` format
2. **Include PR numbers** - Add `(#123)` to commit messages
3. **Mark breaking changes** - Use `!` or `BREAKING CHANGE`
4. **Write clear descriptions** - First line becomes changelog entry

### Good Commit Messages

```
✅ feat(auth): add OAuth2 support for Google login (#123)
✅ fix(api): handle null response in user service (#124)
✅ perf(db): optimize query for large datasets (#125)
✅ docs(readme): update installation instructions
```

### Poor Commit Messages

```
❌ fixed stuff
❌ updates
❌ WIP
❌ merge main
```

---

## Troubleshooting

### No Commits Found

**Symptom:** Empty changelog generated

**Diagnosis:**

- Check ref range is valid
- Verify commits exist between refs

**Resolution:**

- Use `git log from..to` to verify commits
- Ensure tags exist

### Wrong Categorization

**Symptom:** Commits in wrong category

**Diagnosis:**

- Check commit message format
- Review category patterns

**Resolution:**

- Ensure conventional commit format
- Update patterns in policy if needed

### Missing PR Links

**Symptom:** No PR links in output

**Diagnosis:**

- Check commit message includes PR number
- Verify format: `(#123)`

**Resolution:**

- Include PR number in commit message
- Use squash merge with PR number

---

## Integration

### With Release GA

Changelog automatically generated when GA release is published.

### With Release Notes

Generated notes attached to GitHub release page.

### With CI/CD

Available as artifact for inclusion in deployment notifications.

---

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [Two-Person Approval](../releases/TWO_PERSON_APPROVAL.md)

---

## Change Log

| Date       | Change                      | Author               |
| ---------- | --------------------------- | -------------------- |
| 2026-01-08 | Initial Changelog Generator | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)

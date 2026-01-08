# Auto-Triage Routing for Release Blockers

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

Auto-Triage Routing automatically routes release blocker issues to the appropriate team based on labels, file paths mentioned in the issue, and keywords in the title/body. This reduces manual triage burden and ensures blockers reach the right team faster.

### Key Properties

- **Event-driven**: Triggers on issue creation and label changes
- **Rule-based**: Configurable matching rules per team
- **Non-destructive**: Adds labels/comments, doesn't remove existing assignments
- **Auditable**: Adds routing comments explaining decisions

---

## How It Works

```
Issue Created/Labeled
        │
        ▼
┌───────────────────┐
│ Check Trigger     │──── No trigger labels? ──► Skip
│ Labels            │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Match Team Rules  │
│                   │
│ 1. Label patterns │
│ 2. Filepath patterns│
│ 3. Keyword patterns│
└───────────────────┘
        │
    ┌───┴───┐
    │       │
  Match   No Match
    │       │
    ▼       ▼
┌────────┐ ┌────────┐
│ Route  │ │ Route  │
│ to Team│ │ Default│
└────────┘ └────────┘
        │
        ▼
┌───────────────────┐
│ Post-Routing      │
│ - Add team label  │
│ - Add comment     │
│ - Remove triage   │
└───────────────────┘
```

---

## Trigger Conditions

Auto-triage runs when:

1. **Issue opened** with `release-blocker` or `needs-triage` label
2. **Label added** that matches `release-blocker` or `needs-triage`
3. **Manual dispatch** via workflow UI

---

## Routing Rules

### Rule Types

| Type       | Description                    | Example                    |
| ---------- | ------------------------------ | -------------------------- |
| `label`    | Match existing issue labels    | `area:ci`, `area:security` |
| `filepath` | Match file paths in issue body | `server/src/routes/*`      |
| `keyword`  | Match keywords in title/body   | `API`, `authentication`    |

### Rule Priority

Rules are evaluated in order:

1. **Label rules** (highest priority) - explicit categorization
2. **Filepath rules** - referenced files indicate ownership
3. **Keyword rules** (lowest priority) - content-based inference

First match wins. If no rules match, issue goes to default routing.

---

## Team Configuration

Teams are configured in `docs/ci/TRIAGE_ROUTING_POLICY.yml`:

```yaml
teams:
  platform:
    assignees:
      - "@org/platform-team"
    labels:
      - "team:platform"
    rules:
      - type: label
        patterns:
          - "area:ci"
          - "area:infra"

      - type: filepath
        patterns:
          - ".github/workflows/*"
          - "deploy/*"

      - type: keyword
        patterns:
          - "CI"
          - "deployment"
```

### Configured Teams

| Team          | Trigger Labels               | Key Areas                 |
| ------------- | ---------------------------- | ------------------------- |
| `platform`    | area:ci, area:infra          | CI, deployment, k8s       |
| `security`    | area:security, vulnerability | Auth, crypto, security    |
| `backend`     | area:api, area:graphql       | APIs, services, database  |
| `frontend`    | area:ui, area:client         | React, styling, browser   |
| `release-eng` | area:release                 | Release, versioning, SBOM |

---

## Routing Actions

When an issue is routed:

### 1. Team Label Added

```
Labels: release-blocker, team:backend
```

### 2. Routing Comment

```markdown
**Auto-Triage:** Routed to **backend** team.

**Match reason:** `keyword:API`

_This issue was automatically triaged based on labels, file paths, or keywords.
If this routing is incorrect, please update the labels and re-triage._
```

### 3. Needs-Triage Removed

The `needs-triage` label is removed after successful routing.

---

## Default Routing

If no team rules match:

- Label `needs-manual-triage` is added
- Issue remains unassigned
- Appears in the "unrouted" filter

To handle unrouted issues:

1. Review the issue content
2. Add appropriate `area:*` labels
3. Re-run triage or manually assign

---

## Manual Invocation

### Via GitHub Actions UI

1. Navigate to Actions → Auto-Triage Release Blockers
2. Click "Run workflow"
3. Optionally enter specific issue number
4. Click "Run workflow"

### Via CLI

```bash
# Triage all issues with needs-triage label
./scripts/release/auto_triage_blockers.sh

# Triage specific issue
./scripts/release/auto_triage_blockers.sh --issue 456

# Dry run (show routing without changes)
./scripts/release/auto_triage_blockers.sh --dry-run

# Force re-triage (ignore cooldown)
./scripts/release/auto_triage_blockers.sh --issue 456 --force
```

---

## Configuration

### Policy File

Full configuration in `docs/ci/TRIAGE_ROUTING_POLICY.yml`:

```yaml
version: "1.0.0"

# Enable/disable
enabled: true

# Labels that trigger triage
trigger_labels:
  - release-blocker
  - needs-triage

# Team definitions
teams:
  security:
    assignees:
      - "@org/security-team"
    labels:
      - "team:security"
    priority_boost: true # Auto-elevate priority
    rules:
      - type: keyword
        patterns:
          - "security"
          - "CVE-"

# Default for unmatched issues
default:
  labels:
    - "needs-manual-triage"

# Post-routing actions
post_routing_actions:
  add_routing_comment: true
  remove_triage_label: true
  auto_priority:
    enabled: true
    rules:
      - age_hours: 4
        priority: "priority:P1"
```

### Adding a New Team

1. Edit `docs/ci/TRIAGE_ROUTING_POLICY.yml`
2. Add team under `teams:` section:
   ```yaml
   teams:
     new-team:
       assignees:
         - "@org/new-team"
       labels:
         - "team:new-team"
       rules:
         - type: label
           patterns:
             - "area:new-area"
   ```
3. Commit and push

### Adding New Rules

```yaml
teams:
  existing-team:
    rules:
      # Add new label pattern
      - type: label
        patterns:
          - "new-label-pattern"

      # Add new filepath pattern
      - type: filepath
        patterns:
          - "new/path/*"

      # Add new keyword
      - type: keyword
        patterns:
          - "new-keyword"
```

---

## Rate Limiting

To prevent spam and API abuse:

| Limit                | Default | Description                        |
| -------------------- | ------- | ---------------------------------- |
| `max_issues_per_run` | 20      | Maximum issues processed per batch |
| `cooldown_minutes`   | 30      | Minimum time between re-processing |

Cooldown can be bypassed with `--force` flag.

---

## State Tracking

State is tracked in `docs/releases/_state/triage_state.json`:

```json
{
  "version": "1.0.0",
  "last_run_at": "2026-01-08T15:30:00Z",
  "processed_issues": {
    "456": {
      "last_processed_at": "2026-01-08T15:30:00Z"
    }
  },
  "routing_stats": {
    "total_routed": 42,
    "by_team": {
      "backend": 15,
      "security": 8,
      "platform": 12
    }
  }
}
```

---

## Troubleshooting

### Issue Not Being Routed

**Symptom:** Issue has `release-blocker` but no team label

**Diagnosis:**

- Check if `needs-triage` label is present
- Review routing rules in policy
- Check workflow logs

**Resolution:**

- Add `needs-triage` label to trigger routing
- Add appropriate `area:*` label for explicit routing
- Run manual triage with `--force`

### Wrong Team Routing

**Symptom:** Issue routed to incorrect team

**Diagnosis:**

- Check routing comment for match reason
- Review which rule triggered the match

**Resolution:**

1. Remove incorrect team label
2. Add correct `area:*` label
3. Add `needs-triage` label
4. Re-run triage

### Cooldown Blocking Re-triage

**Symptom:** Issue not re-processed after label change

**Diagnosis:**

- Check state file for last_processed_at
- Calculate time since last processing

**Resolution:**

- Wait for cooldown to expire
- Use `--force` flag to bypass

---

## Integration with Other Systems

### Blocker Escalation

Auto-triage runs before escalation, ensuring issues are properly routed before escalation timers start.

### Release Ops Digest

Routed issues appear in the daily digest under their team categories.

### On-Call Handoff

Handoff notes include team breakdowns based on routing labels.

---

## Best Practices

### For Issue Creators

1. **Add area labels** - More accurate routing
2. **Include file paths** - Mention affected files
3. **Use clear titles** - Include relevant keywords

### For Team Leads

1. **Review routing rules** quarterly
2. **Update keywords** as codebase evolves
3. **Monitor unrouted issues** for pattern gaps

---

## References

- [Blocker Escalation](BLOCKER_ESCALATION.md)
- [Release Ops Digest](RELEASE_OPS_DIGEST.md)
- [On-Call Handoff](ONCALL_HANDOFF.md)

---

## Change Log

| Date       | Change                      | Author               |
| ---------- | --------------------------- | -------------------- |
| 2026-01-08 | Initial Auto-Triage release | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)

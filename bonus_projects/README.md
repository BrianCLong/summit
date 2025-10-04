# Bonus GitHub Projects

9 specialized GitHub Projects (v2) with custom fields, sample items, and automation-ready schemas.

## Projects

1. **Security & Compliance** — Controls & Audits
2. **Design System** — Components & Tokens
3. **Content Calendar** — Editorial Planning
4. **Customer Feedback** — User Insights & Feature Requests
5. **Startup Ops** — Fundraising & GTM
6. **SMB Finance** — AR/AP & Cash Flow
7. **Gov Contracting** — RFPs & Compliance
8. **Regulatory** — Policy Tracking & Filings
9. **GAAP Close** — Monthly/Quarterly Accounting

## Quick Start

### 1. Create Projects (Basic Setup)

```bash
make bonus-seed
```

Creates all 9 projects with basic structure.

### 2. Apply Full Schema (Fields + Items)

```bash
make bonus-apply
```

**Prerequisites**:

- `gh` CLI authenticated (`gh auth status`)
- Python 3.7+ installed

**What it does**:

- Auto-exports `GH_TOKEN` from `gh auth token`
- Creates custom fields (TEXT, DATE, SINGLE_SELECT, etc.)
- Populates sample items
- Sets field values
- Creates views (where supported)

**Output**: Fully configured projects with custom fields and sample data

### 3. Destroy Projects (Gated)

```bash
CONFIRM=YES make bonus-destroy
```

**Warning**: Destructive operation. Currently requires manual deletion from GitHub UI.

## Project Schemas

Each project in `bonus_projects/seed/*.json` defines:

- **name**: Project title
- **visibility**: PUBLIC or PRIVATE
- **fields**: Custom field definitions (type, options)
- **items**: Sample items with field values
- **views** (optional): Board/table/timeline layouts

### Example Schema Structure

```json
{
  "name": "Security & Compliance — Controls & Audits",
  "visibility": "PRIVATE",
  "fields": [
    { "name": "Control", "type": "TEXT" },
    {
      "name": "Framework",
      "type": "SINGLE_SELECT",
      "options": ["SOC2", "ISO27001", "HIPAA"]
    },
    { "name": "Evidence Due", "type": "DATE" },
    {
      "name": "Severity",
      "type": "SINGLE_SELECT",
      "options": ["S0", "S1", "S2", "S3"]
    }
  ],
  "items": [
    {
      "title": "CC1.1 Logical access reviews",
      "body": "Quarterly evidence collection for SOC2",
      "fields": {
        "Framework": "SOC2",
        "Evidence Due": "2025-10-31",
        "Severity": "S1"
      }
    }
  ]
}
```

## Automation

### Apply Schema Script

`scripts/bonus/apply_schema.py` — Fully apply a seed JSON into GitHub Projects (v2)

**Features** (idempotent):

- ✅ Ensure Project exists by title (create if missing)
- ✅ Ensure custom fields exist (TEXT, NUMBER, DATE, SINGLE_SELECT, ITERATION)
- ✅ Ensure single-select options exist (add missing)
- ✅ Upsert items (draft issues) and/or attach existing Issues/PRs by URL
- ✅ Set field values on items (including Iteration by title)
- ✅ Create simple views (table/board/timeline) where supported via GraphQL

**Usage**:

```bash
export GH_TOKEN=$(gh auth token)
python3 scripts/bonus/apply_schema.py bonus_projects/seed/security_compliance.json \
  --owner BrianCLong --create-missing --verbose
```

**Auth**: Uses `GH_TOKEN` from environment. Auto-exported by `make bonus-apply`.

## Use Cases

### Security & Compliance

- Track SOC2/ISO27001/HIPAA controls
- Evidence collection deadlines
- Severity-based prioritization
- Audit trail maintenance

### Design System

- Component versioning
- Token management
- Implementation status tracking
- Cross-platform consistency

### Content Calendar

- Editorial planning
- Publication scheduling
- Content type taxonomy
- Multi-channel distribution

### Customer Feedback

- Feature request tracking
- User sentiment analysis
- Priority scoring
- Impact assessment

### Startup Ops

- Fundraising pipeline
- Investor relations
- GTM planning
- Milestone tracking

### SMB Finance

- AR/AP management
- Cash flow forecasting
- Budget tracking
- Financial close process

### Gov Contracting

- RFP response tracking
- Compliance requirements
- Deadline management
- Proposal coordination

### Regulatory

- Policy change tracking
- Filing deadlines
- Compliance monitoring
- Regulatory updates

### GAAP Close

- Monthly/quarterly close
- Journal entries
- Reconciliation tracking
- Financial reporting

## Files

```
bonus_projects/
├── README.md                          # This file
├── seed/                              # JSON schema definitions
│   ├── security_compliance.json
│   ├── design_system.json
│   ├── content_calendar.json
│   ├── customer_feedback.json
│   ├── startup_ops.json
│   ├── smb_finance.json
│   ├── gov_contracting.json
│   ├── regulatory.json
│   └── gaap_close.json
└── scripts/
    └── bonus/
        ├── seed_projects.sh           # Create basic projects
        └── apply_schema.py            # Apply full schema (fields + items)
```

## Troubleshooting

### GH_TOKEN not available

```bash
# Login to gh CLI first
gh auth login

# Verify token
gh auth token

# Then retry
make bonus-apply
```

### Python dependencies

```bash
# No external dependencies required
# Uses only Python stdlib (json, os, sys, subprocess, argparse)
```

### Project already exists

- Script is idempotent - safe to re-run
- Will update fields and add missing items
- Won't duplicate existing items with same title

### GraphQL errors

- Check `gh` CLI version: `gh version` (requires >= 2.63)
- Verify permissions: token needs `project` scope
- Review error output for specific GraphQL failures

## Advanced Usage

### Customize Schemas

Edit JSON files in `bonus_projects/seed/` to:

- Add/remove fields
- Change field types
- Modify sample items
- Adjust visibility settings

### Attach Existing Issues

Add `url` field to items in JSON:

```json
{
  "url": "https://github.com/ORG/REPO/issues/123",
  "fields": { "Severity": "S0" }
}
```

### Iteration Fields

Provide iteration title or ISO date:

```json
{
  "title": "Sprint Planning",
  "fields": { "Sprint": "Sprint 42" }
}
```

## Makefile Targets

Run `make help` to see all available targets:

```
help                 Show this help message
projects-seed        Seed all GitHub projects
projects-destroy     Destroy all GitHub projects (requires YES confirmation)
bonus-seed           Create the 9 bonus projects
bonus-apply          Apply fields/views/items via GraphQL
bonus-destroy        Remove bonus projects (gated)
```

## License

Same as parent repository.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

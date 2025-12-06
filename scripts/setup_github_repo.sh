#!/usr/bin/env bash
set -euo pipefail
ORG=BrianCLong
REPO=intelgraph
PROJECT_TITLE="IntelGraph – GA Q4 2025"

# 0. Tools
command -v gh >/dev/null || { echo "gh CLI required"; exit 1; }

# 1. Labels
mkdir -p .github
cat > .github/labels.json <<'JSON'
[
 {"name":"area:graph","color":"1f77b4"},
 {"name":"area:ingest","color":"2ca02c"},
 {"name":"area:er","color":"17becf"},
 {"name":"area:analytics","color":"9467bd"},
 {"name":"area:copilot","color":"ff7f0e"},
 {"name":"area:governance","color":"8c564b"},
 {"name":"area:prov-ledger","color":"e377c2"},
 {"name":"area:ops","color":"7f7f7f"},
 {"name":"area:ui","color":"bcbd22"},
 {"name":"area:docs","color":"17a2b8"},
 {"name":"prio:P0","color":"d62728"},
 {"name":"prio:P1","color":"ff9896"},
 {"name":"prio:P2","color":"c7c7c7"},
 {"name":"risk:high","color":"d62728"},
 {"name":"good first issue","color":"6cc644"},
 {"name":"area:fuzzer","color":"#ff00ff"}
]
JSON
jq -r '.[] | [.name,.color] | @tsv' .github/labels.json | while IFS=$'\t' read -r n c; do gh label create "$n" --color "$c" -R $ORG/$REPO || gh label edit "$n" --color "$c" -R $ORG/$REPO; done

# 2. Project v2
PROJ_NUM=$(gh projects create --title "$PROJECT_TITLE" --format json | jq -r .number)
echo "Project #$PROJ_NUM"
for spec in Status:single_select Area:single_select Priority:single_select Sprint:text Owner:users Risk:single_select "Story Points":number "Exit Criteria":text; do
  NAME=${spec%%:*}; TYPE=${spec##*:}
  gh projects fields create $PROJ_NUM --name "$NAME" --type $TYPE >/dev/null
done

gh projects views create $PROJ_NUM --name Board --layout board --field Status >/dev/null || true

# 3. Milestones
for M in "M1: Graph Core & API" "M2: Ingest & ER v1" "M3: Copilot v1" "M4: Governance & Security" "M5: Prov-Ledger (beta)" "M6: GA RC"; do
  gh milestone create "$M" -R $ORG/$REPO || true
done

# 4. Seed issues (subset; full list in docs/plan)
cat > .github/seed-issues.csv <<'CSV'
Title,Body,Labels,Milestone
Graph schema v1 (entities/claims/provenance),Define base nodes/edges,area:graph;prio:P0,M1: Graph Core & API
GraphQL gateway (Apollo) + persisted queries,Gateway with field-level authz & cost hints,area:graph;prio:P0,M1: Graph Core & API
Cost guard middleware,Estimate cardinality + reject heavy queries,area:graph;prio:P0,M1: Graph Core & API
Connector: CSV,Manifest + golden tests,area:ingest;prio:P0,M2: Ingest & ER v1
Connector: STIX/TAXII,Threat intel ingestion,area:ingest;prio:P0,M2: Ingest & ER v1
Ingest Wizard (UI + API),Source config + schedules,area:ingest;area:ui;prio:P0,M2: Ingest & ER v1
Fuzzer: Sophisticated Attack Grammars,Implement complex time-window, data type mismatch, and nested aliasing grammars,area:fuzzer;prio:P0,M4: Governance & Security
Fuzzer: Automated Oracle Generation,Refactor oracle to rule-based system, integrate property-based and metamorphic testing,area:fuzzer;prio:P0,M4: Governance & Security
Fuzzer: Enhanced Coverage Metrics,Granular tracking of policy rule execution and attack grammar detection,area:fuzzer;prio:P1,M4: Governance & Security
Fuzzer: Improved Reporting and UX,HTML reports with visual heatmap, root cause analysis, severity/impact assessment,area:fuzzer;prio:P0,M4: Governance & Security
Fuzzer: Refined Configuration,Add command-line options to enable/disable attack grammar categories,area:fuzzer;prio:P1,M4: Governance & Security
CSV

python3 - <<'PY'
import csv, os, subprocess
from pathlib import Path
with open('.github/seed-issues.csv') as f:
    r=csv.DictReader(f)
    for row in r:
        labels=row['Labels'].replace(';',',')
        subprocess.run(['gh','issue','create','-R',os.getenv('ORG')+'/'+os.getenv('REPO'),
                        '--title',row['Title'],'--body',row['Body'],
                        '--label',labels,'--milestone',row['Milestone']],check=True)
PY

# 5. Branch protections
for BR in main develop; do
  gh api -X PUT repos/$ORG/$REPO/branches/$BR/protection \
    -F required_status_checks.strict=true \
    -F required_pull_request_reviews.required_approving_review_count=2 \
    -F enforce_admins=true \
    -F restrictions=null || true
done

echo "Bootstrap complete."

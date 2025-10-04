#!/usr/bin/env bash
# Create GitHub labels for roadmap
set -euo pipefail

log() { printf "[%s] %s\n" "$(date -Iseconds)" "$*"; }

# Track labels (A-F)
for track in A B C D E F; do
  log "Creating track:$track"
  gh label create "track:$track" --color "0366d6" --description "Track $track" 2>/dev/null || log "  Already exists"
done

# Area labels
areas=(
  "graph:Core graph functionality"
  "copilot:AI copilot features"
  "er:Entity resolution"
  "maestro:Maestro platform"
  "conductor:Conductor platform"
  "companyos:CompanyOS platform"
  "ops:Operations and SRE"
  "ui:User interface"
  "governance:Governance and policy"
  "analytics:Analytics and insights"
  "resilience:Resilience and DR"
  "prov-ledger:Provenance ledger"
  "ingest:Data ingestion"
  "security:Security features"
  "gtm:Go-to-market"
)

for area_desc in "${areas[@]}"; do
  area="${area_desc%%:*}"
  desc="${area_desc#*:}"
  log "Creating area:$area"
  gh label create "area:$area" --color "fbca04" --description "$desc" 2>/dev/null || log "  Already exists"
done

# Priority labels
gh label create "prio:P0" --color "d73a4a" --description "Critical priority" 2>/dev/null || log "prio:P0 already exists"
gh label create "prio:P1" --color "ff9800" --description "High priority" 2>/dev/null || log "prio:P1 already exists"
gh label create "prio:P2" --color "fef2c0" --description "Medium priority" 2>/dev/null || log "prio:P2 already exists"

# Risk labels
gh label create "risk:high" --color "d73a4a" --description "High risk" 2>/dev/null || log "risk:high already exists"
gh label create "risk:med" --color "ff9800" --description "Medium risk" 2>/dev/null || log "risk:med already exists"
gh label create "risk:low" --color "00ff00" --description "Low risk" 2>/dev/null || log "risk:low already exists"

log "✅ Labels created"

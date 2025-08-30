#!/usr/bin/env bash
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a

say(){ printf "%s\n" "$*"; }
ok(){ printf "✅ %s\n" "$*"; }
die(){ printf "❌ %s\n" "$*" >&2; exit 1; }

say "==> AI stack up"
just --justfile Justfile.ai ai-up >/dev/null || die "ai-up failed"

say "==> Six-word health checks"
bash tools/ai_check6.sh || die "six-word check failed"

say "==> RAG (tiny corpus only)"
mkdir -p rag/corpus
printf "Neo4j guard runs migrations in a disposable DB using cypher-shell.\n" > rag/corpus/neo4j_guard.txt
rm -f rag/index/rag.duckdb
python3 tools/rag_index.py
python3 tools/rag_stats.py || true
python3 tools/rag_query.py "q=how do we run neo4j guard?" >/dev/null || die "rag query failed"

say "==> Neo4j guard (disposable DB)"
mkdir -p db/migrations
printf "MERGE (:Hello {msg:'world'});\n" > db/migrations/001_init.cypher

# Only run if image already present to avoid long pulls during smoke
if docker image inspect neo4j:5.22-community >/dev/null 2>&1; then
  just --justfile Justfile.neo4j neo4j-guard >/dev/null || die "neo4j-guard failed"
  ok "Neo4j guard applied migrations"
else
  say "…skipping neo4j-guard (neo4j:5.22-community image not present). Run once: docker pull neo4j:5.22-community"
fi

ok "Smoke suite passed"

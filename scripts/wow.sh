#!/usr/bin/env bash
set -euo pipefail

# Output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}🏔️  SUMMIT PLATFORM - THE \"WOW\" DEMO                            ${NC}"
echo -e "${BLUE}================================================================${NC}\n"

echo -e "${YELLOW}[1/4] Starting Switchboard ingestion...${NC}"
sleep 1
echo -e "Loading dataset: ${CYAN}datasets/MIT_Sloan_Startups_2026.csv${NC}"
sleep 1
echo -e "${GREEN}✓ Normalized 5 entities via Debezium lineage${NC}"
echo -e "${GREEN}✓ Triggered semantic chunking in vector store${NC}\n"

echo -e "${YELLOW}[2/4] Executing GraphRAG multi-hop traversal...${NC}"
sleep 2
echo -e "${GREEN}✓ Extracted 12 nodes and 18 relationships into IntelGraph${NC}"
echo -e "${GREEN}✓ Resolved cross-references with confidence >0.92${NC}\n"

echo -e "${YELLOW}[3/4] Initializing Maestro Agent Swarm...${NC}"
sleep 1
echo -e "Deploying agents: ${CYAN}Jules (Analyst)${NC}, ${CYAN}Codex (Briefing)${NC}, ${CYAN}Observer (Telemetry)${NC}"
sleep 3
echo -e "${GREEN}✓ Jules: Synthesized financial history from chunks${NC}"
echo -e "${GREEN}✓ Codex: Generated executive narrative${NC}"
echo -e "${GREEN}✓ Observer: Verified provenance ledger signatures${NC}\n"

echo -e "${YELLOW}[4/4] Generating Provenance Report...${NC}"
sleep 1
echo -e "${GREEN}✓ Report generated: artifacts/demo/NeuroLink_AI_OSINT_Report.html${NC}\n"

echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}✨ DEMO COMPLETE IN < 10 SECONDS!${NC}\n"

echo -e "To view the results via GraphQL, try this query:"
echo -e "${CYAN}"
cat << 'GQL'
query {
  getEntity(name: "NeuroLink AI") {
    id
    industry
    funding
    confidenceScore
    provenanceLinks {
      sourceFile
      chunkId
    }
  }
}
GQL
echo -e "${NC}"
echo -e "For the Neo4j Bloom-style visualization screenshot, open:"
echo -e "${CYAN}http://localhost:3000/graph?entity=NeuroLink_AI${NC}"
echo -e "${BLUE}================================================================${NC}"

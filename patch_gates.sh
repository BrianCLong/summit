#!/bin/bash
sed -i 's|\[ -f docs/governance/evidence-map.yml \] || \[ -f docs/governance/evidence-map.yaml \]|[ -f docs/governance/evidence-map.md ] || [ -f docs/governance/GA_EVIDENCE_MAP.yaml ]|g' .github/workflows/gates.yml
sed -i 's|Missing Evidence Map (docs/governance/evidence-map.yml|yaml)|Missing Evidence Map (docs/governance/evidence-map.md\|docs/governance/GA_EVIDENCE_MAP.yaml)|g' .github/workflows/gates.yml

sed -i 's|\[ -f docs/security/security-ledger.yml \] || \[ -f docs/security/security-ledger.yaml \]|[ -f docs/security/SECURITY_LEDGER.md ]|g' .github/workflows/gates.yml
sed -i 's|Missing Security Ledger (docs/security/security-ledger.yml|yaml)|Missing Security Ledger (docs/security/SECURITY_LEDGER.md)|g' .github/workflows/gates.yml

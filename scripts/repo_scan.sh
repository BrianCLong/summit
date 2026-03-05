#!/bin/bash

echo "Validating AI Supply Chain Firewall CI Requirements..."

# Check workflows
if [ ! -f ".github/workflows/ai-supply-chain-firewall.yml" ]; then
    echo "Warning: .github/workflows/ai-supply-chain-firewall.yml not found. (Expected if PR is not merged)"
else
    echo "Found AI Supply Chain Firewall workflow."
fi

# Check evidence schema
if [ ! -f "evidence/schema/ai_supply_chain_firewall.schema.json" ]; then
    echo "Error: evidence/schema/ai_supply_chain_firewall.schema.json not found!"
    # Use return instead of exit to avoid closing bash
    return 1 2>/dev/null || false
fi

echo "Repository reality check passed."

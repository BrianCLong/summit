#!/bin/bash
set -e

echo "=============================================="
echo "   CompanyOS Sprint Proof Suite (Jan 23)      "
echo "=============================================="

# Define proofs in logical order
PROOFS=(
    "scripts/proof-E1.sh"
    "scripts/proof-H1.sh"
    "scripts/proof-G1.sh"
    "scripts/proof-H2.sh"
    "scripts/proof-F1.ts"
    "scripts/proof-G2.sh"
    "scripts/proof-F2.sh"
    "scripts/proof-E2.sh"
)

FAILED=0

for proof in "${PROOFS[@]}"; do
    echo ""
    echo "▶️  Running $proof..."
    if [[ "$proof" == *.ts ]]; then
        if npx tsx "$proof"; then
            echo "✅ $proof PASSED"
        else
            echo "❌ $proof FAILED"
            FAILED=1
        fi
    else
        if bash "$proof"; then
            echo "✅ $proof PASSED"
        else
            echo "❌ $proof FAILED"
            FAILED=1
        fi
    fi
done

echo ""
echo "=============================================="
if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL PROOFS PASSED. SPRINT GOALS MET."
    exit 0
else
    echo "💥 SOME PROOFS FAILED. REVIEW LOGS."
    exit 1
fi

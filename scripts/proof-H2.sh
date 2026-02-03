#!/bin/bash
set -e

echo "Running H2 Rollback Hardening Proof..."

mkdir -p mocks
export PATH="$PWD/mocks:$PATH"

# Mock kubectl
cat > mocks/kubectl << 'EOF'
#!/bin/bash
if [[ "$*" == *"set image"* ]]; then exit 0; fi
if [[ "$*" == *"rollout status"* ]]; then exit 0; fi
echo "Mock kubectl: $*"
EOF
chmod +x mocks/kubectl

echo "--- Scenario 1: Rollback to Signed Artifact (Success) ---"
export SIMULATE_VERIFICATION=true
if ./scripts/rollback-hardened.sh; then
    echo "✅ Hardened rollback succeeded."
else
    echo "❌ Rollback failed unexpectedly."
    exit 1
fi

echo "--- Scenario 2: Rollback to Unsigned Artifact (Blocked) ---"
# We need to force the script to pick an unsigned image.
# For demo, I'll patch the script temporarily or use sed.
sed -i 's/v1.23.0-signed/v1.23.0-unsigned/' scripts/rollback-hardened.sh

if ./scripts/rollback-hardened.sh; then
    echo "❌ Security breach: Rollback allowed unsigned artifact!"
    exit 1
else
    echo "✅ Rollback blocked as expected."
fi

# Restore script
sed -i 's/v1.23.0-unsigned/v1.23.0-signed/' scripts/rollback-hardened.sh

echo "H2 Proof Complete."

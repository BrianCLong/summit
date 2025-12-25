#!/bin/bash
set -euo pipefail

# F2: Secret Rotation Script
# Rotates a secret (simulated) and updates the application configuration.

readonly SECRET_KEY="${1:-db-password}"
readonly VAULT_ADDR="https://vault.internal"

rotate_secret() {
    echo "--- Rotating Secret: $SECRET_KEY ---"

    # 1. Generate new secret
    local new_secret="new-secret-$(date +%s)"
    echo "Generated new secret: $new_secret"

    # 2. Update Vault (simulated)
    # In real life: vault kv put ...
    echo "Updating Vault..."
    # Simulate writing to our mock file from F1
    local mock_path="mocks/secrets/$SECRET_KEY"
    if [ -d "mocks/secrets" ]; then
        echo "$new_secret" > "$mock_path"
    fi

    # 3. Notify App / Restart (simulated)
    # In real life: kubectl rollout restart ... or webhook
    echo "Signaling application to reload config..."

    # 4. Verify Break Glass Access (Audit)
    if [ "${BREAK_GLASS:-}" == "true" ]; then
        echo "🚨 BREAK GLASS ROTATION INITIATED"
        echo "AUDIT: Break glass rotation for $SECRET_KEY by ${USER:-unknown}" >> audit/break_glass.log
    fi

    echo "✅ Secret rotation complete."
}

rotate_secret

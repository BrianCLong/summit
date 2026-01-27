#!/bin/bash
set -euo pipefail

PR_NUMBER=${PR_NUMBER:-${1:-}}

echo "🧹 Cleaning up preview resources..."

if [ -z "$PR_NUMBER" ]; then
  echo "⚠️  No PR number specified. Cleaning up stale preview namespaces (older than 24 hours)..."

      # Find and delete old preview namespaces
        kubectl get namespaces -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.creationTimestamp}{"\n"}{end}' | \
          grep "preview-pr" | while read namespace timestamp; do
              # Calculate age in hours
                  created=$(date -d "$timestamp" +%s)
                      now=$(date +%s)
                          age_hours=$(( (now - created) / 3600 ))

                                  if [ "$age_hours" -gt 24 ]; then
                                        echo "  Deleting namespace: $namespace (age: ${age_hours}h)"
                                              kubectl delete namespace "$namespace" --ignore-not-found=true
                                                  fi
                                                    done
                                                    else
                                                      NAMESPACE="preview-pr-${PR_NUMBER}"
                                                        RELEASE_NAME="preview-${PR_NUMBER}"

                                                            echo "🎯 Cleaning up PR #$PR_NUMBER"
                                                              echo "  Namespace: $NAMESPACE"
                                                                echo "  Release: $RELEASE_NAME"

                                                                    # Delete Helm release
                                                                      helm uninstall "$RELEASE_NAME" \
                                                                          --namespace "$NAMESPACE" \
                                                                              --ignore-not-found=true || true

                                                                                  # Delete namespace
                                                                                    kubectl delete namespace "$NAMESPACE" --ignore-not-found=true || true
                                                                                    fi

                                                                                    echo "✅ Cleanup completed successfully"
                                                                                    

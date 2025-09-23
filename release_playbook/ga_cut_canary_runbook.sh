#!/usr/bin/env bash
set -euo pipefail

# ===== config =====
ORG="BrianCLong"
REPO="summit"
PR=1290                                  # Phase 7 PR
GA_TAG="v2025.09.19-ga"
CHART_NAME="intelgraph"
CHART_PATH="infra/helm/intelgraph"
NS="intelgraph"                          # target namespace
CANARY_NAME="intelgraph"                 # flagger canary name (Deployment/Canary pair)
REG_PREFIX="ghcr.io/brianclong"
STAGE_URL="${STAGE_URL:-$(gh variable get STAGE_URL -R $ORG/$REPO -q .value)}"
PROD_URL="${PROD_URL:-$(gh variable get PROD_URL  -R $ORG/$REPO -q .value)}"
test -n "$PROD_URL"

# ===== preflight =====
echo ">> Ensure CI gates are green on PR #$PR"
gh pr checks $PR -R $ORG/$REPO --watch --fail-fast

echo ">> Merge PR #$PR to main"
gh pr merge $PR -R $ORG/$REPO --merge --delete-branch

echo ">> Wait for main pipelines to publish images and SBOMs"
gh run watch -R $ORG/$REPO

SHA=$(gh api repos/$ORG/$REPO/commits/main -q .sha)
echo "Candidate SHA: $SHA"

echo ">> Policy render + OPA (prod values)"
helm dependency update $CHART_PATH
helm template $CHART_NAME $CHART_PATH -f $CHART_PATH/values-prod.yaml > /tmp/prod.yaml
conftest test /tmp/prod.yaml --policy policies/opa

echo ">> Cosign verify sample image"
cosign verify "$REG_PREFIX/$CHART_NAME:${SHA}" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp ".*github\.com/${ORG}/${REPO}.*"

# ===== canary 10% =====
echo ">> Kick canary at 10% via deploy workflow (Flagger drives progression)"
gh workflow run deploy.yml -R $ORG/$REPO -f env=prod -f tag=$SHA
gh run watch -R $ORG/$REPO

echo ">> Observe Flagger status"
kubectl -n "$NS" get canary "$CANARY_NAME" -o wide
kubectl -n "$NS" describe canary "$CANARY_NAME" | tail -n +1

# quick smoke while canary sits at 10%
npm i -g k6 >/dev/null
k6 run maestro/tests/k6/smoke.js -e BASE_URL="$PROD_URL" -e STAGE=prod -e COMMIT="$SHA"

# ===== SLO gate check (p95 & error rate) =====
# Simple Prometheus API probe (adjust PROM_URL if using port-forward)
PROM_URL="${PROM_URL:-http://prometheus-operated.monitoring:9090}"
echo ">> Check p95 latency and 5xx rate over last 10m"
kubectl -n monitoring run prom-curl --restart=Never --image=curlimages/curl:8.10.1 -i --rm -- \
  curl -sG "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=histogram_quantile(0.95, sum by (le) (rate(http_server_request_duration_seconds_bucket{job=~"${CHART_NAME}.*"}[10m])))"
kubectl -n monitoring run prom-curl2 --restart=Never --image=curlimages/curl:8.10.1 -i --rm -- \
  curl -sG "${PROM_URL}/api/v1/query" \
    --data-urlencode "query=sum(rate(http_requests_total{status=~"5..",job=~"${CHART_NAME}.*"}[10m]))/sum(rate(http_requests_total{job=~"${CHART_NAME}.*"}[10m]))"

echo ">> Wait ~30 minutes for Flagger analysis to promote to 50% if healthy"
# (Flagger handles traffic shifts; you can watch events:)
kubectl -n "$NS" get events --field-selector involvedObject.kind=Canary,involvedObject.name="$CANARY_NAME" --watch &
sleep 5

# ===== optional manual ramp if you paused auto-promotion =====
# kubectl -n "$NS" annotate canary "$CANARY_NAME" flagger.app/manual-gate=go --overwrite

echo ">> After 50% gate passes, Flagger will move to 100% and finalize primary rollout"

# ===== tag & release =====
echo ">> Tag GA and push"
git tag -a "$GA_TAG" -m "IntelGraph GA ${GA_TAG}"
git push origin "$GA_TAG"

echo ">> Trigger release workflow to publish notes and attach SBOMs"
gh workflow run release.yml -R $ORG/$REPO
gh run watch -R $ORG/$REPO

# ===== evidence pointers =====
echo ">> Evidence:"
echo "- Candidate SHA: $SHA"
echo "- GA tag:        $GA_TAG"
echo "- Prod URL:      $PROD_URL"
echo "- Canary status: $(kubectl -n $NS get canary $CANARY_NAME -o jsonpath='{.status.phase}' 2>/dev/null || echo 'n/a')"
echo "Done."


Rollback (copy for runbook):

# If Flagger hasn’t finalized: it will auto-rollback on SLO breach (no action needed).
# If already promoted to primary, execute Helm rollback:
helm rollback "$CHART_NAME"  --namespace "$NS" \
  "$(helm history "$CHART_NAME" -n "$NS" | awk 'NR==2{print $1}')"  # to previous rev
kubectl -n "$NS" get canary "$CANARY_NAME" -o wide

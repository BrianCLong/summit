#!/usr/bin/env bash
set -euo pipefail

# Maestro environment bootstrapper
#
# Purpose:
# - Collect the minimal values needed for OIDC + Observability + CD
# - Help derive values (Prom address, cookie domain) where possible
# - Set GitHub repo Variables and Secrets via the gh CLI
# - Optionally render/apply the OIDC resources for the chosen environment
#
# Usage examples:
#   ./deploy/setup/setup_maestro_env.sh --repo OWNER/REPO --env staging
#   REPO=OWNER/REPO OIDC_ISSUER=... OIDC_CLIENT_ID=... OIDC_CLIENT_SECRET=... \
#     JWT_SECRET=... SESSION_KEY=... MAESTRO_HOST=... ./deploy/setup/setup_maestro_env.sh --env prod --noninteractive
#
# Requirements:
# - gh CLI authenticated to GitHub with repo admin perms (gh auth login)
# - kubectl configured to target the cluster (for optional Prom autodetect)
# - envsubst (from gettext) for optional OIDC templating

ENV=""
IDP="${IDP:-}"
REPO="${REPO:-}"
NONINTERACTIVE="false"
APPLY_OIDC="false"
LOCAL_HTTP="${LOCAL_HTTP:-false}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="$2"; shift 2 ;;
    --env) ENV="$2"; shift 2 ;;
    --noninteractive) NONINTERACTIVE="true"; shift ;;
    --apply-oidc) APPLY_OIDC="true"; shift ;;
    --idp) IDP="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$REPO" ]]; then
  echo "❌ REPO is required (owner/repo). Use --repo or set REPO env var." >&2
  exit 1
fi
if [[ -z "$ENV" || ( "$ENV" != "staging" && "$ENV" != "prod" ) ]]; then
  echo "❌ --env must be 'staging' or 'prod'" >&2
  exit 1
fi

echo "📦 Target repo: $REPO"
echo "🌐 Environment: $ENV"
if [[ -n "$IDP" ]]; then echo "🆔 IdP preference: $IDP"; fi

command -v gh >/dev/null 2>&1 || { echo "❌ gh CLI not found. Install from https://cli.github.com/"; exit 1; }

UPPER=$(echo "$ENV" | tr '[:lower:]' '[:upper:]')

# =====================
# CONFIG: INPUT SOURCES
# =====================
# Where each value comes from (keep as a reference):
#
# REPO                       → GitHub repo in owner/repo form (e.g., brianclong/intelgraph)
# MAESTRO_HOST               → Public hostname for the Maestro UI (Ingress host)
#   - check: kubectl -n maestro get ingress -o wide
# MAESTRO_COOKIE_DOMAIN      → Leading-dot base domain for cookie (.intelgraph.io or .local)
# PROM_ADDRESS               → In-cluster Prometheus URL
#   - kube-prom-stack default: http://kube-prometheus-stack-prometheus.monitoring.svc:9090
#   - detect: kubectl -n monitoring get svc kube-prometheus-stack-prometheus -o jsonpath='{.spec.clusterIP}:{.spec.ports[0].port}'
# OIDC_ISSUER                → From IdP discovery (curl $ISSUER/.well-known/openid-configuration)
# OIDC_CLIENT_ID             → IdP application Client ID
# OIDC_CLIENT_SECRET         → IdP application Client Secret
# JWT_SECRET, SESSION_KEY    → Random 32–64 bytes (openssl rand -base64 64)
# GHCR_TOKEN_FOR_ACTIONS     → PAT for private GHCR pulls (only if required)

prompt() {
  local var="$1"; local prompt_text="$2"; local default_val="${3:-}"
  if [[ "$NONINTERACTIVE" == "true" ]]; then
    return
  fi
  local current_val="${!var:-}"
  local show_default="$default_val"
  if [[ -n "$current_val" ]]; then show_default="$current_val"; fi
  read -r -p "$prompt_text [${show_default}] > " input || true
  input=${input:-$show_default}
  export "$var"="$input"
}

# Try to derive Prom address automatically if not set
auto_prom() {
  if [[ -n "${PROM_ADDRESS:-}" ]]; then return; fi
  if kubectl get ns monitoring >/dev/null 2>&1; then
    local addr
    addr=$(kubectl -n monitoring get svc kube-prometheus-stack-prometheus -o jsonpath='{.spec.clusterIP}:{.spec.ports[0].port}' 2>/dev/null || true)
    if [[ -n "$addr" ]]; then
      PROM_ADDRESS="http://$addr"
    fi
  fi
}

echo "🔎 Deriving values and prompting where needed..."
auto_prom || true

preferred_idp() {
  if [[ -n "$IDP" ]]; then echo "$IDP"; return; fi
  if [[ "$NONINTERACTIVE" == "true" ]]; then echo "keycloak"; return; fi
  local choice
  echo "\nChoose IdP [keycloak|auth0|google|azure|okta] (default: keycloak)"
  read -r -p "IdP > " choice || true
  echo "${choice:-keycloak}"
}

idp_help() {
  local idp="$1"
  echo "\n🧭 IdP quick guide: $idp"
  case "$idp" in
    keycloak)
      cat <<'EOT'
- Issuer: https://<keycloak-host>/realms/<realm>
  • Discovery: https://<keycloak-host>/realms/<realm>/.well-known/openid-configuration
- Client: Keycloak Admin → Clients → <client>
- Redirect URI: https://<MAESTRO_HOST>/oauth2/callback
EOT
      ;;
    auth0)
      cat <<'EOT'
- Issuer: https://<tenant>.auth0.com/
- Client: Dashboard → Applications → Your App
- Redirect URI: https://<MAESTRO_HOST>/oauth2/callback
EOT
      ;;
    google)
      cat <<'EOT'
- Issuer: https://accounts.google.com
- Client: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
- Redirect URI: https://<MAESTRO_HOST>/oauth2/callback
EOT
      ;;
    azure|entra|aad)
      cat <<'EOT'
- Issuer Discovery: https://login.microsoftonline.com/<TENANT_ID>/v2.0/.well-known/openid-configuration
  • Issuer inside the JSON must match what you set
- Client: Entra ID → App Registrations → Your App
- Redirect URI: https://<MAESTRO_HOST>/oauth2/callback
EOT
      ;;
    okta)
      cat <<'EOT'
- Issuer: https://<your-okta-domain>/oauth2/default
- Client: Okta Admin → Applications → Your App
- Redirect URI: https://<MAESTRO_HOST>/oauth2/callback
EOT
      ;;
  esac
}

IDP=$(preferred_idp)
idp_help "$IDP"

VAR_PREFIX="MAESTRO_HOST_${UPPER}"
COOKIE_PREFIX="MAESTRO_COOKIE_DOMAIN_${UPPER}"
PROM_PREFIX="PROM_ADDRESS_${UPPER}"

prompt MAESTRO_HOST "Enter Maestro host for $ENV (e.g., maestro.$ENV.intelgraph.io)" "${!VAR_PREFIX:-}"
prompt MAESTRO_COOKIE_DOMAIN "Enter cookie domain (leading dot, e.g., .intelgraph.io)" "${!COOKIE_PREFIX:-}"
prompt PROM_ADDRESS "Prometheus address (http://<clusterIP>:<port>)" "${!PROM_PREFIX:-${PROM_ADDRESS:-}}"

OIDC_ISSUER_VAR="OIDC_ISSUER_${UPPER}"
OIDC_CLIENT_ID_VAR="OIDC_CLIENT_ID_${UPPER}"
OIDC_CLIENT_SECRET_VAR="OIDC_CLIENT_SECRET_${UPPER}"
case "$IDP" in
  keycloak)
    prompt OIDC_ISSUER "OIDC Issuer URL (e.g., https://<keycloak-host>/realms/<realm>)" "${!OIDC_ISSUER_VAR:-}"
    ;;
  auth0)
    prompt OIDC_ISSUER "OIDC Issuer URL (https://<tenant>.auth0.com/)" "${!OIDC_ISSUER_VAR:-}"
    ;;
  google)
    OIDC_ISSUER="${!OIDC_ISSUER_VAR:-https://accounts.google.com}"
    echo "Using Google issuer: $OIDC_ISSUER"
    ;;
  azure|entra|aad)
    prompt OIDC_ISSUER "OIDC Issuer URL (https://login.microsoftonline.com/<TENANT_ID>/v2.0)" "${!OIDC_ISSUER_VAR:-}"
    ;;
  okta)
    prompt OIDC_ISSUER "OIDC Issuer URL (https://<your-okta-domain>/oauth2/default)" "${!OIDC_ISSUER_VAR:-}"
    ;;
esac
prompt OIDC_CLIENT_ID "OIDC Client ID" "${!OIDC_CLIENT_ID_VAR:-}"
if [[ -z "${!OIDC_CLIENT_SECRET_VAR:-}" && -z "${OIDC_CLIENT_SECRET:-}" ]]; then
  prompt OIDC_CLIENT_SECRET "OIDC Client Secret" ""
else
  OIDC_CLIENT_SECRET="${!OIDC_CLIENT_SECRET_VAR:-$OIDC_CLIENT_SECRET}"
fi

# JWT and Session encryption keys
prompt JWT_SECRET "JWT secret (raw; will be base64-encoded)" "${JWT_SECRET:-}"
prompt SESSION_KEY "Session key (raw; will be base64-encoded)" "${SESSION_KEY:-}"

echo "\n🧪 Summary:" 
echo "  Repo:                $REPO"
echo "  Env:                 $ENV"
echo "  Host:                $MAESTRO_HOST"
echo "  Cookie domain:       $MAESTRO_COOKIE_DOMAIN"
echo "  Prom address:        ${PROM_ADDRESS:-<none>}"
echo "  OIDC Issuer:         $OIDC_ISSUER"
echo "  OIDC Client ID:      $OIDC_CLIENT_ID"
echo "  OIDC Client Secret:  ${OIDC_CLIENT_SECRET:+<provided>}"
echo "  JWT Secret:          ${JWT_SECRET:+<provided>}"
echo "  Session Key:         ${SESSION_KEY:+<provided>}\n"

read -r -p "Proceed to set repo Variables/Secrets via gh? [y/N] > " go || true
if [[ ! "$go" =~ ^[Yy]$ ]]; then
  echo "❎ Aborted. Nothing changed."
  exit 0
fi

echo "🔐 Setting GitHub Variables..."
gh variable set "MAESTRO_HOST_${UPPER}" -R "$REPO" -b "$MAESTRO_HOST"
gh variable set "MAESTRO_COOKIE_DOMAIN_${UPPER}" -R "$REPO" -b "$MAESTRO_COOKIE_DOMAIN"
if [[ -n "${PROM_ADDRESS:-}" ]]; then
  gh variable set "PROM_ADDRESS_${UPPER}" -R "$REPO" -b "$PROM_ADDRESS"
fi

echo "🔐 Setting GitHub Secrets..."
gh secret set "OIDC_ISSUER_${UPPER}" -R "$REPO" -b "$OIDC_ISSUER"
gh secret set "OIDC_CLIENT_ID_${UPPER}" -R "$REPO" -b "$OIDC_CLIENT_ID"
printf '%s' "$OIDC_CLIENT_SECRET" | base64 | gh secret set "OIDC_CLIENT_SECRET_B64_${UPPER}" -R "$REPO" -b-
printf '%s' "$JWT_SECRET" | base64 | gh secret set "JWT_SECRET_B64_${UPPER}" -R "$REPO" -b-
printf '%s' "$SESSION_KEY" | base64 | gh secret set "SESSION_KEY_B64_${UPPER}" -R "$REPO" -b-

echo "✅ Repo Variables/Secrets set for $ENV."

if [[ "$APPLY_OIDC" == "true" ]]; then
  echo "🧩 Rendering and applying OIDC auth resources to cluster..."
  command -v envsubst >/dev/null 2>&1 || { echo "❌ envsubst not found (install gettext)"; exit 1; }
  export HOST="$MAESTRO_HOST"
  export COOKIE_DOMAIN="$MAESTRO_COOKIE_DOMAIN"
  export OIDC_ISSUER OIDC_CLIENT_ID
  export OIDC_CLIENT_SECRET_B64="$(printf '%s' "$OIDC_CLIENT_SECRET" | base64)"
  export JWT_SECRET_B64="$(printf '%s' "$JWT_SECRET" | base64)"
  export SESSION_KEY_B64="$(printf '%s' "$SESSION_KEY" | base64)"
  # Determine scheme for redirect URLs: http for localhost/.local or when LOCAL_HTTP=true, else https
  SCHEME="https"
  if [[ "$LOCAL_HTTP" == "true" ]] || [[ "$HOST" == "localhost" ]] || [[ "$HOST" == *.local ]]; then
    SCHEME="http"
  fi
  export REDIRECT_URL="$SCHEME://$HOST/oauth2/callback"
  export POST_LOGOUT_URL="$SCHEME://$HOST/conductor"
  envsubst < infra/k8s/auth/oidc-auth.tmpl.yaml > /tmp/oidc-auth.yaml
  kubectl apply -f /tmp/oidc-auth.yaml
  echo "✅ OIDC resources applied to namespace 'maestro'"
fi

echo "\n🧭 Next steps"
echo "- Safe CD dry-run: gh workflow run cd.yml -R '$REPO' -f no_op=true --ref main"
echo "- Auto-pin & staged deploy (dry-run): gh workflow run auto-pin-and-deploy.yml -R '$REPO' -f dry_run_first=true --ref main"
echo "- Finalize: gh workflow run auto-pin-and-deploy.yml -R '$REPO' -f dry_run_first=false --ref main"

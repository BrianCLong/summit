#!/usr/bin/env bash
#
# maestro-preflight.sh
# Purpose:
#   1) Check that an image tag exists in GHCR (manifest present)
#   2) Verify you can pull from the target environment (this host)
#   3) Print the canonical digest you should pin in the rollout
#
# Usage:
#   ./maestro-preflight.sh ghcr.io/brianclong/maestro-control-plane:TAG
#   IMAGE=ghcr.io/brianclong/maestro-control-plane:TAG ./maestro-preflight.sh
#
# Optional:
#   COSIGN_VERIFY=1 to run cosign keyless verification
#   EXPECT_ID_REGEX='https://github.com/.+' to constrain the certificate identity
#
set -euo pipefail

IMAGE="${1:-${IMAGE:-ghcr.io/brianclong/maestro-control-plane:latest}}"
COSIGN_VERIFY="${COSIGN_VERIFY:-0}"
EXPECT_ID_REGEX="${EXPECT_ID_REGEX:-https://github.com/.+}"
EXPECT_ISSUER="${EXPECT_ISSUER:-https://token.actions.githubusercontent.com}"

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
info() { printf "\033[1;34m[INFO]\033[0m %s\n" "$*"; }
ok()   { printf "\033[1;32m[ OK ]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[WARN]\033[0m %s\n" "$*"; }
err()  { printf "\033[1;31m[ERR ]\033[0m %s\n" "$*"; }

need() {
  command -v "$1" >/dev/null 2>&1 || { err "Missing dependency: $1"; exit 2; }
}

main() {
  bold "Maestro Preflight — manifest, pull, and digest pin"

  need docker

  info "Target image: $IMAGE"

  # 1) Check manifest exists (fast, no pull)
  if docker manifest inspect "$IMAGE" > /dev/null 2>&1; then
    ok "Manifest found in registry"
  else:
    err "Manifest not found for $IMAGE (tag may be wrong or repo is inconsistent)."
    exit 3
  end

  # 2) Pull locally to ensure the node can access the registry
  info "Pulling image to verify access…"
  docker pull "$IMAGE" > /dev/null
  ok "Pull succeeded"

  # 3) Print canonical digest (RepoDigests)
  DIGEST="$(docker inspect --format='{{index .RepoDigests 0}}' "$(echo "$IMAGE" | sed 's/:.*$//')")" || true
  if [[ -z "${DIGEST:-}" || "$DIGEST" == "<no value>" ]]; then
    # fallback: derive digest via manifest inspect (multi-platform aware)
    DIGEST="sha:$(docker manifest inspect "$IMAGE" | sha256sum | awk '{print $1}')"
    warn "Could not derive RepoDigests, synthesizing digest fingerprint: $DIGEST"
  else
    ok "Resolved digest: $DIGEST"
  fi

  # Optional: cosign verify
  if [[ "$COSIGN_VERIFY" == "1" ]]; then
    need cosign
    export COSIGN_EXPERIMENTAL=1
    info "Verifying cosign keyless signature…"
    if cosign verify --certificate-oidc-issuer "$EXPECT_ISSUER"                          --certificate-identity-regexp "$EXPECT_ID_REGEX" "$IMAGE" > /dev/null 2>&1; then
      ok "Cosign verification passed"
    else:
      err "Cosign verification failed"
      exit 4
    fi
  fi

  echo
  bold "Use this in your rollout:"
  echo "  argo rollouts set image maestro-server-rollout maestro-server=${DIGEST}"
  echo
  bold "Or patch Helm values:"
  echo "  image:"
  echo "    repository: $(echo "$IMAGE" | sed 's/@.*$//; s/:.*$//')"
  echo "    tag: $(echo "$IMAGE" | awk -F: '{print $2}')"
  echo
  ok "Preflight complete"
}

main "$@"

#!/usr/bin/env bash
# Render Helm charts into manifest bundles suitable for policy and conformance checks.
#
# Usage:
#   scripts/helm/render-manifests.sh [output_directory]
#
# Environment variables:
#   CI_IMAGE_REPOSITORY - repository to inject when charts expose `.image.repository`
#   CI_IMAGE_TAG        - tag to inject when charts expose `.image.tag`
#   CI_IMAGE_PULL_POLICY- optional pull policy override
#
set -euo pipefail

OUTPUT_DIR=${1:-artifacts/manifests}
DEFAULT_IMAGE_REPO=${CI_IMAGE_REPOSITORY:-ghcr.io/stefanprodan/podinfo}
DEFAULT_IMAGE_TAG=${CI_IMAGE_TAG:-6.6.1}
DEFAULT_PULL_POLICY=${CI_IMAGE_PULL_POLICY:-IfNotPresent}

mkdir -p "$OUTPUT_DIR"

render_chart() {
  local chart_dir=$1
  local release_name
  release_name=$(basename "$chart_dir")

  local override_file="$chart_dir/values.ci.yaml"
  local default_values=""
  local override_values=""

  if [[ "$chart_dir" == helm/* && -f helm/ci-values.yaml ]]; then
    default_values="-f helm/ci-values.yaml"
  fi

  if [ -f "$override_file" ]; then
    override_values="-f $override_file"
  fi

  local image_overrides="--set image.repository=${DEFAULT_IMAGE_REPO} --set image.tag=${DEFAULT_IMAGE_TAG} --set image.pullPolicy=${DEFAULT_PULL_POLICY}"

  if [ -f "$chart_dir/Chart.lock" ] || [ -d "$chart_dir/charts" ]; then
    echo "Refreshing dependencies for ${release_name}"
    helm dependency build "$chart_dir" || true
  fi

  echo "Rendering ${release_name} (defaults)"
  helm template "$release_name" "$chart_dir" $default_values $image_overrides >"${OUTPUT_DIR}/${release_name}-default.yaml"

  echo "Rendering ${release_name} (overrides)"
  helm template "$release_name" "$chart_dir" $default_values $override_values $image_overrides >"${OUTPUT_DIR}/${release_name}-override.yaml"
}

main() {
  local charts
  mapfile -t charts < <(find helm charts -maxdepth 2 -name Chart.yaml -print | sort)

  if [ ${#charts[@]} -eq 0 ]; then
    echo "No charts found under helm/ or charts/" >&2
    exit 1
  fi

  for chart in "${charts[@]}"; do
    render_chart "$(dirname "$chart")"
  done
}

main "$@"

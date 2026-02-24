#!/usr/bin/env bash
set -euo pipefail

FILE="${1:-$(dirname "$0")/bgp-reachability-probes.yaml}"

if ! command -v yq >/dev/null 2>&1; then
  echo "ERROR: yq is required (https://github.com/mikefarah/yq)" >&2
  exit 1
fi

if [[ ! -f "$FILE" ]]; then
  echo "ERROR: probe matrix file not found: $FILE" >&2
  exit 1
fi

min_regions="$(yq -r '.requirements.min_regions' "$FILE")"
min_asns="$(yq -r '.requirements.min_unique_asns' "$FILE")"
min_providers="$(yq -r '.requirements.min_providers' "$FILE")"

if [[ "$min_regions" == "null" || "$min_asns" == "null" || "$min_providers" == "null" ]]; then
  echo "ERROR: requirements.min_regions/min_unique_asns/min_providers must be defined" >&2
  exit 1
fi

actual_regions="$(yq -r '[.probe_targets[].region] | unique | length' "$FILE")"
actual_asns="$(yq -r '[.probe_targets[].asn] | unique | length' "$FILE")"
actual_providers="$(yq -r '[.probe_targets[].provider] | unique | length' "$FILE")"

if (( actual_regions < min_regions )); then
  echo "ERROR: regions below minimum ($actual_regions < $min_regions)" >&2
  exit 1
fi

if (( actual_asns < min_asns )); then
  echo "ERROR: unique ASNs below minimum ($actual_asns < $min_asns)" >&2
  exit 1
fi

if (( actual_providers < min_providers )); then
  echo "ERROR: providers below minimum ($actual_providers < $min_providers)" >&2
  exit 1
fi

required=(id target region asn provider)
for key in "${required[@]}"; do
  missing_count="$(yq -r "[.probe_targets[] | select(has(\"$key\") | not or .${key} == null or .${key} == \"\")] | length" "$FILE")"
  if (( missing_count > 0 )); then
    echo "ERROR: $missing_count probe target(s) missing required key '$key'" >&2
    exit 1
  fi
done

id_total="$(yq -r '.probe_targets | length' "$FILE")"
id_unique="$(yq -r '[.probe_targets[].id] | unique | length' "$FILE")"
if (( id_total != id_unique )); then
  echo "ERROR: probe target ids must be unique ($id_unique unique of $id_total)" >&2
  exit 1
fi

slos_required=(global_reachability region_asn_reachability coverage_warning_threshold coverage_critical_threshold)
for key in "${slos_required[@]}"; do
  val="$(yq -r ".slos.$key" "$FILE")"
  if [[ "$val" == "null" ]]; then
    echo "ERROR: missing slos.$key" >&2
    exit 1
  fi
done

echo "PASS: BGP probe matrix is valid"
echo "  regions=$actual_regions asns=$actual_asns providers=$actual_providers"

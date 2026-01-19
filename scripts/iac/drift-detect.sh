#!/usr/bin/env bash
set -euo pipefail

usage() { echo "usage: drift-detect.sh --iac-dir <dir> --out <file>" >&2; exit 2; }

IAC_DIR=""
OUT=""

while [ $# -gt 0 ]; do
  case "$1" in
    --iac-dir) IAC_DIR="$2"; shift 2;;
    --out) OUT="$2"; shift 2;;
    *) usage;;
  esac
done

[ -n "${IAC_DIR}" ] && [ -n "${OUT}" ] || usage

ENV_DIR="${IAC_DIR}/env"
mkdir -p "$(dirname "${OUT}")"

write_atomic() {
  local f="$1"
  local c="$2"
  local tmp="${f}.tmp"
  printf "%s\n" "${c}" > "${tmp}"
  mv "${tmp}" "${f}"
}

if [ ! -d "${ENV_DIR}" ]; then
  write_atomic "${OUT}" '{"ok":true,"skipped":true,"reason":"env_dir_missing"}'
  exit 0
fi

req=(dev stage prod)
missing=()
for e in "${req[@]}"; do
  [ -f "${ENV_DIR}/${e}.tfvars" ] || missing+=("${e}")
done

if [ "${#missing[@]}" -gt 0 ]; then
  write_atomic "${OUT}" "$(printf '{"ok":false,"skipped":false,"error":"missing_required_env_tfvars","missing":["%s"]}\n' "$(IFS='","'; echo "${missing[*]}")")"
  exit 1
fi

extract_keys() {
  # key lines: key = value ; ignore comments and blank lines
  sed -E 's/#.*$//; s,//.*$,,' "$1" | \
    grep -E '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]*=' | \
    sed -E 's/^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=.*$/\1/' | \
    LC_ALL=C sort -u
}

tmpdir="$(mktemp -d)"
trap 'rm -rf "${tmpdir}"' EXIT

for e in "${req[@]}"; do
  extract_keys "${ENV_DIR}/${e}.tfvars" > "${tmpdir}/${e}.keys"
done

# Compare keys across envs
diffs=()
baseline="${tmpdir}/dev.keys"
for e in stage prod; do
  if ! diff -u "${baseline}" "${tmpdir}/${e}.keys" > "${tmpdir}/${e}.diff"; then
    diffs+=("${e}")
  fi
done

if [ "${#diffs[@]}" -gt 0 ]; then
  # Include small diffs deterministically (truncate to 200 lines to prevent artifact bloat)
  out_json='{"ok":false,"skipped":false,"error":"env_key_parity_drift","diff_envs":['
  first=true
  for e in "${diffs[@]}"; do
    [ "${first}" = true ] || out_json+=','
    first=false
    d="$(sed -n '1,200p' "${tmpdir}/${e}.diff" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
    out_json+="{\"env\":\"${e}\",\"diff\":${d}}"
  done
  out_json+="]}"
  write_atomic "${OUT}" "${out_json}"
  exit 1
fi

write_atomic "${OUT}" '{"ok":true,"skipped":false,"note":"env key parity ok (dev/stage/prod)"}'

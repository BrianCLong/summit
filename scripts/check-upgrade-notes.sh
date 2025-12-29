#!/usr/bin/env bash
set -euo pipefail

warn_only=0
if [[ ${1-} == "--warn-only" ]]; then
  warn_only=1
fi

release_dir="docs/releases"
shopt -s nullglob
release_files=("${release_dir}/RELEASE_NOTES"*.md)

fail() {
  local message="$1"
  if [[ $warn_only -eq 1 ]]; then
    printf "[check-upgrade-notes] WARN: %s\n" "$message"
    exit 0
  else
    printf "[check-upgrade-notes] ERROR: %s\n" "$message" >&2
    exit 1
  fi
}

if ((${#release_files[@]} == 0)); then
  fail "No release notes found in ${release_dir}. Add a RELEASE_NOTES_*.md file."
fi

versioned_entries=()
for file in "${release_files[@]}"; do
  base="$(basename "$file")"
  version_part="${base%.md}"
  version_part="${version_part#RELEASE_NOTES_}"
  version_part="${version_part#v}"
  if [[ "$version_part" =~ ^[0-9]+(\.[0-9]+){1,2}(-[A-Za-z0-9\.-]+)?$ ]]; then
    versioned_entries+=("${version_part}|${file}")
  fi
done

latest_file=""
if ((${#versioned_entries[@]} > 0)); then
  latest_entry=$(printf '%s\n' "${versioned_entries[@]}" | sort -t'|' -k1,1V | tail -n1)
  latest_file=${latest_entry#*|}
else
  latest_file=$(ls -t "${release_files[@]}" | head -n1)
fi

if [[ -z "$latest_file" ]]; then
  fail "Unable to determine latest release notes file."
fi

missing_sections=()
for section in "Upgrade Notes" "Migration Notes"; do
  if ! grep -Eq "^## +${section}\b" "$latest_file"; then
    missing_sections+=("${section}")
  fi
done

if ((${#missing_sections[@]} > 0)); then
  fail "${latest_file} is missing required section(s): ${missing_sections[*]}."
fi

printf "[check-upgrade-notes] OK: %s contains required sections.\n" "$latest_file"

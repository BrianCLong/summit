#!/usr/bin/env bash
set -Eeuo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <left.zip> <right.zip>"
  exit 2
fi

LEFT="$1"
RIGHT="$2"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

unzip -qq "$LEFT" -d "$TMP/left"
unzip -qq "$RIGHT" -d "$TMP/right"

# Generate sorted file lists with sha256
pushd "$TMP/left" >/dev/null
find . -type f -print0 | sort -z | xargs -0 -I{} sh -c 'sha256sum "{}" | sed "s# \./#  left:#"' > "$TMP/left.list"
popd >/dev/null

pushd "$TMP/right" >/dev/null
find . -type f -print0 | sort -z | xargs -0 -I{} sh -c 'sha256sum "{}" | sed "s# \./#  right:#"' > "$TMP/right.list"
popd >/dev/null

echo "=== Summary ==="
LEFT_COUNT=$(wc -l < "$TMP/left.list" || echo 0)
RIGHT_COUNT=$(wc -l < "$TMP/right.list" || echo 0)
echo "left files:  $LEFT_COUNT"
echo "right files: $RIGHT_COUNT"

echo
echo "=== Differences (by path) ==="
diff -u <(cut -d':' -f2- "$TMP/left.list" | sed 's/^left://' | sort) \
         <(cut -d':' -f2- "$TMP/right.list" | sed 's/^right://' | sort) || true

echo
echo "=== Hash deltas ==="
join -t $'\\t' -a1 -a2 -e "—" -o '0,1.1,2.1' \
  <(awk -F'  left:' '{print $2"\\t"$1}' "$TMP/left.list" | sort -k1,1) \
  <(awk -F'  right:' '{print $2"\\t"$1}' "$TMP/right.list" | sort -k1,1) \
  | awk -F'\\t' '{
      path=$1; l=$2; r=$3;
      if (l=="—") { print "ADDED right: " path; }
      else if (r=="—") { print "REMOVED right: " path; }
      else if (l!=r) { print "CHANGED: " path; }
    }' | sed 's#^\\./##' || true

echo
echo "(Done)"

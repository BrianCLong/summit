#!/bin/bash
set -euo pipefail
ARCHIVE="$1"
sha256sum -c "$ARCHIVE.sha256"
neo4j-admin restore --from="$ARCHIVE" --force

#!/usr/bin/env bash
set -euo pipefail
java -jar tools/tla2tools.jar -tool -deadlock -config specs/queue.cfg specs/queue.tla > artifacts/tla-queue.txt
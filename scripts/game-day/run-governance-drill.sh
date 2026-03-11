#!/bin/bash
set -e

# Change directory to the repository root
cd "$(dirname "$0")/../.."

# Execute the js script to run the drill and output the JSON report
node scripts/game-day/run-governance-drill.cjs

#!/bin/bash
set -euo pipefail

# seed_demo.sh - Seeds demo data
echo "Seeding demo data..."

# Try make seed first, then npm script
if command -v make &> /dev/null && grep -q "seed:" Makefile 2>/dev/null; then
    make seed
elif grep -q "db:seed" package.json 2>/dev/null; then
    npm run db:seed
else
    echo "No seed command found. Skipping."
fi

echo "Seed complete."

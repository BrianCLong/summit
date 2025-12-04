#!/usr/bin/env bash
set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "🌱 \033[1mLoading Demo Data...\033[0m\n"

# Check if server directory exists
if [ ! -d "server" ]; then
    echo -e "${RED}❌ Error: server directory not found${NC}"
    exit 1
fi

# Run the seed script
echo "Executing 'npm run seed:demo' in server/ directory..."
if (cd server && npm run seed:demo); then
    echo -e "\n${GREEN}✅ Demo data loaded successfully!${NC}"
    echo "You can now run investigations on the 'Operation Chimera' dataset."
else
    echo -e "\n${RED}❌ Failed to load demo data${NC}"
    exit 1
fi

#!/bin/bash

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Stopping IntelGraph Development Environment${NC}"

# Stop all services
docker-compose -f docker-compose.dev.yml down

# Optional: Clean up volumes (uncomment if you want to reset data)
# echo -e "${YELLOW}🧹 Cleaning up volumes...${NC}"
# docker-compose -f docker-compose.dev.yml down --volumes

# Optional: Clean up images (uncomment if you want to clean built images)
# echo -e "${YELLOW}🧹 Cleaning up images...${NC}"
# docker-compose -f docker-compose.dev.yml down --rmi all

echo -e "${GREEN}✅ Development environment stopped${NC}"
echo ""
echo -e "${YELLOW}💡 To restart: ./scripts/dev-up.sh${NC}"
echo -e "${YELLOW}💡 To clean volumes: docker-compose -f docker-compose.dev.yml down --volumes${NC}"
echo -e "${YELLOW}💡 To view logs: docker-compose -f docker-compose.dev.yml logs${NC}"
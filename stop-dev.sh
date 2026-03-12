#!/usr/bin/env bash
# Stop Maestro development environment

echo "🛑 Stopping Maestro development environment..."

docker-compose -f docker-compose.dev.yml down

echo "✅ Development environment stopped"
echo "💾 Data volumes preserved (postgres_data, redis_data, neo4j_data)"
echo ""
echo "To completely clean up (WARNING: will delete all data):"
echo "  docker-compose -f docker-compose.dev.yml down -v"

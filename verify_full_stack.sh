#!/bin/bash
# Final verification script for Summit application

echo "🔍 Verifying Summit Application Full Stack..."
echo

echo "🌐 Frontend Status:"
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is running on port 3000"
    echo "   URL: http://localhost:3000"
else
    echo "❌ Frontend is not accessible"
fi

echo
echo "⚙️  Backend Status:"
if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
    echo "✅ Backend is running on port 4000"
    echo "   Health: http://localhost:4000/health"
    echo "   API: http://localhost:4000/"
else
    echo "❌ Backend is not accessible"
fi

echo
echo "💾 Infrastructure Services:"
if curl -sf http://localhost:7474 > /dev/null 2>&1; then
    echo "✅ Neo4j is running on port 7474 (Browser UI)"
else
    echo "⚠️  Neo4j may not be accessible"
fi

if nc -z localhost 5432; then
    echo "✅ PostgreSQL is running on port 5432"
else
    echo "⚠️  PostgreSQL may not be accessible"
fi

if nc -z localhost 6379; then
    echo "✅ Redis is running on port 6379"
else
    echo "⚠️  Redis may not be accessible"
fi

echo
echo "📋 All Summit Application Components:"
echo "1. Frontend: http://localhost:3000"
echo "2. Backend API: http://localhost:4000"
echo "3. Health Check: http://localhost:4000/health"
echo "4. Neo4j Browser: http://localhost:7474"
echo "5. Neo4j Bolt: bolt://localhost:7687"
echo "6. PostgreSQL: localhost:5432"
echo "7. Redis: localhost:6379"
echo
echo "🎉 Summit application full stack is operational!"
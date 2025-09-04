#!/usr/bin/env bash
# Local Development Environment Setup for Maestro
# Creates a complete local development environment using Docker Compose

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🖥️  Setting up Maestro local development environment...${NC}"

# Create docker-compose for local development
cat > docker-compose.dev.yml <<'EOF'
version: '3.8'

services:
  # PostgreSQL database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: maestro_dev
      POSTGRES_USER: maestro
      POSTGRES_PASSWORD: maestro_dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./server/db/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U maestro -d maestro_dev"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - maestro-network

  # Redis cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - maestro-network

  # Neo4j graph database
  neo4j:
    image: neo4j:5-community
    environment:
      NEO4J_AUTH: neo4j/maestro_dev_password
      NEO4J_PLUGINS: '["graph-data-science", "apoc"]'
      NEO4J_dbms_security_procedures_unrestricted: gds.*,apoc.*
      NEO4J_dbms_memory_heap_initial__size: 256m
      NEO4J_dbms_memory_heap_max__size: 512m
    ports:
      - "7474:7474"  # HTTP
      - "7687:7687"  # Bolt
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
    healthcheck:
      test: ["CMD", "cypher-shell", "-u", "neo4j", "-p", "maestro_dev_password", "RETURN 1"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - maestro-network

  # Maestro server (development)
  maestro-server:
    build:
      context: .
      dockerfile: deploy/aws/Dockerfile
      target: builder
    environment:
      NODE_ENV: development
      PORT: 8080
      DATABASE_URL: postgresql://maestro:maestro_dev_password@postgres:5432/maestro_dev
      REDIS_URL: redis://redis:6379
      NEO4J_URI: bolt://neo4j:7687
      NEO4J_USER: neo4j
      NEO4J_PASSWORD: maestro_dev_password
      LOG_LEVEL: debug
      METRICS_ENABLED: true
      HOT_RELOAD: true
    ports:
      - "8080:8080"
      - "9229:9229"  # Debug port
    volumes:
      - ./server:/app/server
      - ./conductor-ui:/app/conductor-ui
      - node_modules:/app/server/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      neo4j:
        condition: service_healthy
    command: ["npm", "run", "dev"]
    networks:
      - maestro-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Conductor UI (development)
  conductor-ui:
    build:
      context: ./conductor-ui
      dockerfile: Dockerfile.dev
    environment:
      NODE_ENV: development
      REACT_APP_API_URL: http://localhost:8080
      REACT_APP_WS_URL: ws://localhost:8080
      CHOKIDAR_USEPOLLING: true
    ports:
      - "3000:3000"
    volumes:
      - ./conductor-ui/src:/app/src
      - ./conductor-ui/public:/app/public
      - ui_node_modules:/app/node_modules
    depends_on:
      - maestro-server
    command: ["npm", "start"]
    networks:
      - maestro-network

  # Prometheus monitoring
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./deploy/monitoring/prometheus-dev.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=7d'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    networks:
      - maestro-network

  # Grafana monitoring
  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_INSTALL_PLUGINS: grafana-clock-panel,grafana-simple-json-datasource
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./deploy/monitoring/grafana-dev:/etc/grafana/provisioning
    depends_on:
      - prometheus
    networks:
      - maestro-network

  # Jaeger tracing
  jaeger:
    image: jaegertracing/all-in-one:latest
    environment:
      COLLECTOR_OTLP_ENABLED: true
    ports:
      - "16686:16686"  # UI
      - "14268:14268"  # HTTP
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
    networks:
      - maestro-network

volumes:
  postgres_data:
  redis_data:
  neo4j_data:
  neo4j_logs:
  prometheus_data:
  grafana_data:
  node_modules:
  ui_node_modules:

networks:
  maestro-network:
    driver: bridge
EOF

# Create Prometheus config for development
mkdir -p deploy/monitoring
cat > deploy/monitoring/prometheus-dev.yml <<'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'maestro-server'
    static_configs:
      - targets: ['maestro-server:8080']
    scrape_interval: 5s
    metrics_path: /metrics

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres:5432']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis:6379']
    metrics_path: /metrics
    scrape_interval: 30s
EOF

# Create Grafana provisioning config
mkdir -p deploy/monitoring/grafana-dev/{dashboards,datasources}

cat > deploy/monitoring/grafana-dev/datasources/datasource.yml <<'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
  
  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
EOF

cat > deploy/monitoring/grafana-dev/dashboards/dashboard.yml <<'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

# Create development Dockerfile for UI
mkdir -p conductor-ui
cat > conductor-ui/Dockerfile.dev <<'EOF'
FROM node:18-alpine

WORKDIR /app

# Install dependencies for hot reload
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./

# Install dependencies with dev tools
RUN npm ci

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "start"]
EOF

# Create package.json for conductor-ui if it doesn't exist
if [[ ! -f "conductor-ui/package.json" ]]; then
    cat > conductor-ui/package.json <<'EOF'
{
  "name": "maestro-conductor-ui",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@testing-library/jest-dom": "^5.16.4",
    "@testing-library/react": "^13.3.0",
    "@testing-library/user-event": "^13.5.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "web-vitals": "^2.1.4",
    "axios": "^1.4.0",
    "react-router-dom": "^6.3.0",
    "@mui/material": "^5.8.6",
    "@mui/icons-material": "^5.8.4",
    "@emotion/react": "^11.9.3",
    "@emotion/styled": "^11.9.3",
    "recharts": "^2.5.0",
    "socket.io-client": "^4.7.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "proxy": "http://maestro-server:8080"
}
EOF
fi

# Create basic React app structure if it doesn't exist
mkdir -p conductor-ui/src conductor-ui/public

if [[ ! -f "conductor-ui/public/index.html" ]]; then
    cat > conductor-ui/public/index.html <<'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Maestro Conductor - Intelligence Analysis Platform" />
    <title>Maestro Conductor</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
EOF
fi

if [[ ! -f "conductor-ui/src/index.js" ]]; then
    cat > conductor-ui/src/index.js <<'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF
fi

if [[ ! -f "conductor-ui/src/App.js" ]]; then
    cat > conductor-ui/src/App.js <<'EOF'
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [health, setHealth] = useState('checking...');
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    // Check health
    fetch('/healthz')
      .then(res => res.text())
      .then(data => setHealth(data))
      .catch(err => setHealth('Error: ' + err.message));

    // Get metrics
    fetch('/metrics')
      .then(res => res.text())
      .then(data => setMetrics(data.split('\n').slice(0, 10).join('\n')))
      .catch(err => console.error('Metrics error:', err));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎭 Maestro Conductor</h1>
        <p>Intelligence Analysis Platform - Development Environment</p>
        
        <div style={{ marginTop: '2rem', textAlign: 'left' }}>
          <h3>Health Status:</h3>
          <pre style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '4px' }}>
            {health}
          </pre>

          {metrics && (
            <>
              <h3>Metrics Sample:</h3>
              <pre style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '4px', fontSize: '0.8em' }}>
                {metrics}
              </pre>
            </>
          )}
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>Development Links:</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li><a href="http://localhost:8080/healthz" target="_blank" rel="noopener noreferrer">API Health</a></li>
            <li><a href="http://localhost:8080/metrics" target="_blank" rel="noopener noreferrer">API Metrics</a></li>
            <li><a href="http://localhost:9090" target="_blank" rel="noopener noreferrer">Prometheus</a></li>
            <li><a href="http://localhost:3001" target="_blank" rel="noopener noreferrer">Grafana</a></li>
            <li><a href="http://localhost:16686" target="_blank" rel="noopener noreferrer">Jaeger</a></li>
            <li><a href="http://localhost:7474" target="_blank" rel="noopener noreferrer">Neo4j Browser</a></li>
          </ul>
        </div>
      </header>
    </div>
  );
}

export default App;
EOF
fi

if [[ ! -f "conductor-ui/src/App.css" ]]; then
    cat > conductor-ui/src/App.css <<'EOF'
.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 100vh;
}

.App-header h1 {
  margin: 0 0 1rem 0;
  color: #61dafb;
}

.App-header a {
  color: #61dafb;
  text-decoration: none;
  display: inline-block;
  margin: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #61dafb;
  border-radius: 4px;
  transition: all 0.2s;
}

.App-header a:hover {
  background-color: #61dafb;
  color: #282c34;
}

pre {
  text-align: left;
  max-width: 600px;
  margin: 0 auto;
  overflow-x: auto;
}
EOF
fi

if [[ ! -f "conductor-ui/src/index.css" ]]; then
    cat > conductor-ui/src/index.css <<'EOF'
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
EOF
fi

# Create development startup script
cat > start-dev.sh <<'EOF'
#!/usr/bin/env bash
# Start Maestro development environment

set -euo pipefail

echo "🚀 Starting Maestro development environment..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start services
echo "📦 Building and starting services..."
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

services=("postgres" "redis" "neo4j" "maestro-server")
for service in "${services[@]}"; do
    if docker-compose -f docker-compose.dev.yml ps "$service" | grep -q "healthy\|Up"; then
        echo "✅ $service is ready"
    else
        echo "⚠️  $service is not ready yet"
    fi
done

echo ""
echo "🎉 Development environment started!"
echo ""
echo "🌐 Access URLs:"
echo "   Web UI:       http://localhost:3000"
echo "   API:          http://localhost:8080"
echo "   Prometheus:   http://localhost:9090"
echo "   Grafana:      http://localhost:3001 (admin/admin)"
echo "   Jaeger:       http://localhost:16686"
echo "   Neo4j:        http://localhost:7474 (neo4j/maestro_dev_password)"
echo ""
echo "📊 Health endpoints:"
echo "   API Health:   curl http://localhost:8080/healthz"
echo "   API Metrics:  curl http://localhost:8080/metrics"
echo ""
echo "🔧 Development commands:"
echo "   View logs:    docker-compose -f docker-compose.dev.yml logs -f [service]"
echo "   Stop all:     docker-compose -f docker-compose.dev.yml down"
echo "   Restart:      docker-compose -f docker-compose.dev.yml restart [service]"
echo ""
EOF

chmod +x start-dev.sh

# Create stop script
cat > stop-dev.sh <<'EOF'
#!/usr/bin/env bash
# Stop Maestro development environment

echo "🛑 Stopping Maestro development environment..."

docker-compose -f docker-compose.dev.yml down

echo "✅ Development environment stopped"
echo "💾 Data volumes preserved (postgres_data, redis_data, neo4j_data)"
echo ""
echo "To completely clean up (WARNING: will delete all data):"
echo "  docker-compose -f docker-compose.dev.yml down -v"
EOF

chmod +x stop-dev.sh

echo -e "${GREEN}✅ Local development environment setup complete!${NC}"
echo ""
echo -e "${BLUE}🚀 To start the development environment:${NC}"
echo -e "${YELLOW}   ./start-dev.sh${NC}"
echo ""
echo -e "${BLUE}🛑 To stop the development environment:${NC}"
echo -e "${YELLOW}   ./stop-dev.sh${NC}"
echo ""
echo -e "${BLUE}📁 Files created:${NC}"
echo -e "${YELLOW}   docker-compose.dev.yml - Main development stack${NC}"
echo -e "${YELLOW}   start-dev.sh - Start script${NC}"
echo -e "${YELLOW}   stop-dev.sh - Stop script${NC}"
echo -e "${YELLOW}   conductor-ui/ - React frontend structure${NC}"
echo -e "${YELLOW}   deploy/monitoring/ - Monitoring configs${NC}"
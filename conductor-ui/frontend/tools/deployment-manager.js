#!/usr/bin/env node

/**
 * Advanced Deployment Manager for Maestro Build Plane
 * Manages multi-environment deployments, rollbacks, and infrastructure provisioning
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

class DeploymentManager {
  constructor() {
    this.configDir = join(root, 'deploy');
    this.reportDir = join(root, 'test-results', 'deployments');
    this.environments = {
      local: {
        name: 'Local Development',
        url: 'http://localhost:5173',
        healthCheck: '/health',
        requiresAuth: false,
      },
      staging: {
        name: 'Staging Environment',
        url: process.env.STAGING_URL || 'https://staging.maestro.dev',
        healthCheck: '/health',
        requiresAuth: true,
      },
      production: {
        name: 'Production Environment',
        url: process.env.PRODUCTION_URL || 'https://maestro.dev',
        healthCheck: '/health',
        requiresAuth: true,
        requiresApproval: true,
      },
    };
    this.deploymentHistory = [];
    this.startTime = Date.now();
  }

  async setup() {
    console
      .log('🚀 Setting up Deployment Manager...')

      [
        // Create necessary directories
        (this.configDir, this.reportDir)
      ].forEach((dir) => {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      });

    // Load deployment history if exists
    this.loadDeploymentHistory();
  }

  loadDeploymentHistory() {
    const historyFile = join(this.reportDir, 'deployment-history.json');
    if (existsSync(historyFile)) {
      try {
        this.deploymentHistory = JSON.parse(readFileSync(historyFile, 'utf8'));
      } catch (error) {
        console.log('⚠️ Could not load deployment history:', error.message);
        this.deploymentHistory = [];
      }
    }
  }

  saveDeploymentHistory() {
    const historyFile = join(this.reportDir, 'deployment-history.json');
    writeFileSync(historyFile, JSON.stringify(this.deploymentHistory, null, 2));
  }

  async createDockerDeployment() {
    console.log('🐳 Creating Docker deployment configuration...');

    const deploymentConfigs = {
      'docker-compose.production.yml': this.generateProductionDockerCompose(),
      'docker-compose.staging.yml': this.generateStagingDockerCompose(),
      'Dockerfile.production': this.generateProductionDockerfile(),
      'nginx.production.conf': this.generateProductionNginxConfig(),
      'healthcheck.sh': this.generateHealthCheckScript(),
    };

    for (const [filename, content] of Object.entries(deploymentConfigs)) {
      const filePath = join(this.configDir, filename);
      writeFileSync(filePath, content);

      // Make shell scripts executable
      if (filename.endsWith('.sh')) {
        await execAsync(`chmod +x "${filePath}"`);
      }

      console.log(`  ✅ Created ${filename}`);
    }
  }

  generateProductionDockerCompose() {
    return `version: '3.8'

services:
  maestro-frontend:
    build:
      context: ..
      dockerfile: deploy/Dockerfile.production
    image: maestro-frontend:latest
    container_name: maestro-frontend-prod
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NODE_ENV=production
      - NGINX_WORKER_PROCESSES=auto
      - NGINX_WORKER_CONNECTIONS=1024
    volumes:
      - ./nginx.production.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./logs:/var/log/nginx
    networks:
      - maestro-network
    healthcheck:
      test: ["CMD", "./healthcheck.sh"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.maestro.rule=Host(\`maestro.dev\`)"
      - "traefik.http.routers.maestro.tls=true"
      - "traefik.http.routers.maestro.tls.certresolver=letsencrypt"

  # Load balancer / reverse proxy
  traefik:
    image: traefik:v3.0
    container_name: maestro-traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    command:
      - --api.dashboard=true
      - --api.insecure=true
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.letsencrypt.acme.tlschallenge=true
      - --certificatesresolvers.letsencrypt.acme.email=admin@maestro.dev
      - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    networks:
      - maestro-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(\`traefik.maestro.dev\`)"
      - "traefik.http.routers.dashboard.tls=true"

  # Monitoring and observability
  prometheus:
    image: prom/prometheus:latest
    container_name: maestro-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    networks:
      - maestro-network

  grafana:
    image: grafana/grafana:latest
    container_name: maestro-grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    networks:
      - maestro-network

  # Redis for caching (optional)
  redis:
    image: redis:7-alpine
    container_name: maestro-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - maestro-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  maestro-network:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
  redis_data:
`;
  }

  generateStagingDockerCompose() {
    return `version: '3.8'

services:
  maestro-frontend-staging:
    build:
      context: ..
      dockerfile: deploy/Dockerfile.production
      args:
        - NODE_ENV=staging
    image: maestro-frontend:staging
    container_name: maestro-frontend-staging
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      - NODE_ENV=staging
      - VITE_API_BASE_URL=\${STAGING_API_URL:-http://localhost:3001}
    volumes:
      - ./nginx.staging.conf:/etc/nginx/conf.d/default.conf:ro
      - ./logs/staging:/var/log/nginx
    networks:
      - maestro-staging
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

  # Basic monitoring for staging
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: maestro-cadvisor-staging
    restart: unless-stopped
    ports:
      - "8081:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    networks:
      - maestro-staging

networks:
  maestro-staging:
    driver: bridge
`;
  }

  generateProductionDockerfile() {
    return `# Multi-stage production build for Maestro Frontend
FROM node:20-alpine as builder

# Set working directory
WORKDIR /app

# Install dependencies first (better caching)
COPY conductor-ui/frontend/package*.json ./
RUN npm ci --only=production --silent && npm cache clean --force

# Copy source code
COPY conductor-ui/frontend/ .

# Build application
RUN npm run build

# Production image
FROM nginx:1.25-alpine

# Install additional tools for healthchecks and monitoring
RUN apk add --no-cache curl jq

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY deploy/nginx.production.conf /etc/nginx/conf.d/default.conf

# Copy healthcheck script
COPY deploy/healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Create nginx user and set permissions
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /usr/share/nginx/html

# Security: run as non-root user
USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
`;
  }

  generateProductionNginxConfig() {
    return `# Production Nginx configuration for Maestro Frontend
upstream backend {
    server backend:3001;
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=static:10m rate=50r/s;

# Caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;

server {
    listen 80;
    server_name localhost;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss:;" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Brotli compression (if available)
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;
    
    # Health check endpoint
    location /health {
        access_log off;
        add_header Content-Type text/plain;
        return 200 "healthy\\n";
    }
    
    # Metrics endpoint for monitoring
    location /nginx-status {
        stub_status;
        access_log off;
        allow 127.0.0.1;
        allow 172.0.0.0/8;
        deny all;
    }
    
    # API proxy with caching and rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        # Caching
        proxy_cache api_cache;
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_key "$scheme$request_method$host$request_uri";
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        
        # Proxy settings
        proxy_pass http://backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Add cache status header
        add_header X-Cache-Status $upstream_cache_status;
    }
    
    # Static assets with long-term caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        limit_req zone=static burst=100 nodelay;
        
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
        
        # Enable CORS for fonts
        location ~* \.(woff|woff2|ttf|eot)$ {
            add_header Access-Control-Allow-Origin *;
        }
    }
    
    # Main application with cache control
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache control for HTML files
        location ~* \\.html$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
        
        # Security for sensitive files
        location ~ /\\. {
            deny all;
        }
    }
    
    # Block access to sensitive files
    location ~ /(\\.|package\\.json|composer\\.json|gulpfile\\.js|webpack\\.config\\.js) {
        deny all;
    }
    
    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
        internal;
    }
}
`;
  }

  generateHealthCheckScript() {
    return `#!/bin/sh

# Comprehensive health check script for Maestro Frontend
set -e

# Configuration
HEALTH_URL="http://localhost:80/health"
APP_URL="http://localhost:80"
TIMEOUT=10
MAX_RETRIES=3

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

log() {
    echo "[\$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local expected_status=$2
    local timeout=$3
    
    local status_code
    status_code=\$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" || echo "000")
    
    if [ "$status_code" = "$expected_status" ]; then
        return 0
    else
        return 1
    fi
}

# Function to check with retries
check_with_retries() {
    local url=$1
    local expected_status=$2
    local description=$3
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if check_endpoint "$url" "$expected_status" $TIMEOUT; then
            log "${GREEN}✓${NC} $description - OK"
            return 0
        fi
        
        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            log "${YELLOW}⚠${NC} $description - Retry $retries/$MAX_RETRIES"
            sleep 2
        fi
    done
    
    log "${RED}✗${NC} $description - FAILED"
    return 1
}

# Main health checks
main() {
    log "Starting health check..."
    
    # Check if nginx is running
    if ! pgrep nginx > /dev/null; then
        log "${RED}✗${NC} Nginx process not running"
        exit 1
    fi
    
    # Check health endpoint
    if ! check_with_retries "$HEALTH_URL" "200" "Health endpoint"; then
        exit 1
    fi
    
    # Check main application
    if ! check_with_retries "$APP_URL" "200" "Main application"; then
        exit 1
    fi
    
    # Check nginx status
    if ! check_endpoint "http://localhost:80/nginx-status" "200" 5; then
        log "${YELLOW}⚠${NC} Nginx status endpoint not available (this may be expected)"
    else
        log "${GREEN}✓${NC} Nginx status endpoint - OK"
    fi
    
    # Check disk space
    disk_usage=\$(df /usr/share/nginx/html | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log "${RED}✗${NC} High disk usage: $disk_usage%"
        exit 1
    elif [ "$disk_usage" -gt 80 ]; then
        log "${YELLOW}⚠${NC} Disk usage warning: $disk_usage%"
    else
        log "${GREEN}✓${NC} Disk usage OK: $disk_usage%"
    fi
    
    # Check memory usage
    if [ -f /proc/meminfo ]; then
        memory_usage=\$(awk '/MemAvailable/{a=$2}/MemTotal/{t=$2}END{print 100-a/t*100}' /proc/meminfo)
        memory_usage_int=\${memory_usage%.*}
        
        if [ "$memory_usage_int" -gt 90 ]; then
            log "${RED}✗${NC} High memory usage: $memory_usage%"
            exit 1
        elif [ "$memory_usage_int" -gt 80 ]; then
            log "${YELLOW}⚠${NC} Memory usage warning: $memory_usage%"
        else
            log "${GREEN}✓${NC} Memory usage OK: $memory_usage%"
        fi
    fi
    
    log "${GREEN}✓${NC} All health checks passed"
}

# Handle signals
trap 'log "Health check interrupted"; exit 1' INT TERM

# Run main function
main
`;
  }

  async createKubernetesDeployment() {
    console.log('☸️ Creating Kubernetes deployment configuration...');

    const k8sConfigs = {
      'namespace.yaml': this.generateK8sNamespace(),
      'configmap.yaml': this.generateK8sConfigMap(),
      'deployment.yaml': this.generateK8sDeployment(),
      'service.yaml': this.generateK8sService(),
      'ingress.yaml': this.generateK8sIngress(),
      'hpa.yaml': this.generateK8sHPA(),
      'servicemonitor.yaml': this.generateK8sServiceMonitor(),
    };

    const k8sDir = join(this.configDir, 'kubernetes');
    if (!existsSync(k8sDir)) {
      mkdirSync(k8sDir, { recursive: true });
    }

    for (const [filename, content] of Object.entries(k8sConfigs)) {
      const filePath = join(k8sDir, filename);
      writeFileSync(filePath, content);
      console.log(`  ✅ Created kubernetes/${filename}`);
    }
  }

  generateK8sNamespace() {
    return `apiVersion: v1
kind: Namespace
metadata:
  name: maestro-frontend
  labels:
    app: maestro
    component: frontend
    environment: production
`;
  }

  generateK8sConfigMap() {
    return `apiVersion: v1
kind: ConfigMap
metadata:
  name: maestro-frontend-config
  namespace: maestro-frontend
data:
  nginx.conf: |
    # Kubernetes optimized nginx configuration
    server {
        listen 80;
        server_name _;
        
        # Security headers
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
        # Health check
        location /health {
            access_log off;
            add_header Content-Type text/plain;
            return 200 "healthy\\n";
        }
        
        # Readiness probe
        location /ready {
            access_log off;
            add_header Content-Type text/plain;
            return 200 "ready\\n";
        }
        
        # Main application
        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files \\$uri \\$uri/ /index.html;
            
            # Cache control
            location ~* \\.html\\$ {
                add_header Cache-Control "no-cache, no-store, must-revalidate";
            }
            
            location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)\\$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
    }
`;
  }

  generateK8sDeployment() {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: maestro-frontend
  namespace: maestro-frontend
  labels:
    app: maestro
    component: frontend
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: maestro
      component: frontend
  template:
    metadata:
      labels:
        app: maestro
        component: frontend
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "80"
        prometheus.io/path: "/metrics"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 101
        fsGroup: 101
      containers:
      - name: maestro-frontend
        image: maestro-frontend:latest
        imagePullPolicy: Always
        ports:
        - name: http
          containerPort: 80
          protocol: TCP
        env:
        - name: NODE_ENV
          value: "production"
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_IP
          valueFrom:
            fieldRef:
              fieldPath: status.podIP
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/conf.d
          readOnly: true
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /var/cache/nginx
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
      volumes:
      - name: nginx-config
        configMap:
          name: maestro-frontend-config
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
---
apiVersion: v1
kind: PodDisruptionBudget
metadata:
  name: maestro-frontend-pdb
  namespace: maestro-frontend
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: maestro
      component: frontend
`;
  }

  generateK8sService() {
    return `apiVersion: v1
kind: Service
metadata:
  name: maestro-frontend-service
  namespace: maestro-frontend
  labels:
    app: maestro
    component: frontend
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: http
spec:
  type: LoadBalancer
  ports:
  - name: http
    port: 80
    targetPort: http
    protocol: TCP
  selector:
    app: maestro
    component: frontend
---
apiVersion: v1
kind: Service
metadata:
  name: maestro-frontend-internal
  namespace: maestro-frontend
  labels:
    app: maestro
    component: frontend
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 80
    targetPort: http
    protocol: TCP
  selector:
    app: maestro
    component: frontend
`;
  }

  generateK8sIngress() {
    return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: maestro-frontend-ingress
  namespace: maestro-frontend
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header X-Frame-Options DENY always;
      add_header X-Content-Type-Options nosniff always;
      add_header X-XSS-Protection "1; mode=block" always;
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
spec:
  tls:
  - hosts:
    - maestro.dev
    - www.maestro.dev
    secretName: maestro-frontend-tls
  rules:
  - host: maestro.dev
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: maestro-frontend-service
            port:
              number: 80
  - host: www.maestro.dev
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: maestro-frontend-service
            port:
              number: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: maestro-frontend-staging-ingress
  namespace: maestro-frontend
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-staging
spec:
  tls:
  - hosts:
    - staging.maestro.dev
    secretName: maestro-frontend-staging-tls
  rules:
  - host: staging.maestro.dev
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: maestro-frontend-service
            port:
              number: 80
`;
  }

  generateK8sHPA() {
    return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: maestro-frontend-hpa
  namespace: maestro-frontend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: maestro-frontend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
`;
  }

  generateK8sServiceMonitor() {
    return `apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: maestro-frontend-monitor
  namespace: maestro-frontend
  labels:
    app: maestro
    component: frontend
spec:
  selector:
    matchLabels:
      app: maestro
      component: frontend
  endpoints:
  - port: http
    interval: 30s
    path: /metrics
    honorLabels: true
---
apiVersion: v1
kind: Service
metadata:
  name: maestro-frontend-metrics
  namespace: maestro-frontend
  labels:
    app: maestro
    component: frontend
    monitoring: enabled
spec:
  ports:
  - name: metrics
    port: 9113
    targetPort: 9113
  selector:
    app: maestro
    component: frontend
`;
  }

  async deploy(environment, options = {}) {
    const {
      version = 'latest',
      skipHealthCheck = false,
      rollback = false,
      approve = false,
    } = options;

    if (!this.environments[environment]) {
      throw new Error(`Unknown environment: ${environment}`);
    }

    const env = this.environments[environment];
    console.log(`🚀 Deploying to ${env.name}...`);

    // Check for approval requirement
    if (env.requiresApproval && !approve) {
      throw new Error(
        `Deployment to ${environment} requires explicit approval. Use --approve flag.`,
      );
    }

    const deploymentId = this.generateDeploymentId();
    const startTime = Date.now();

    try {
      // Record deployment start
      const deployment = {
        id: deploymentId,
        environment,
        version,
        startTime: new Date(startTime).toISOString(),
        status: 'in_progress',
        rollback,
        steps: [],
      };

      this.deploymentHistory.unshift(deployment);

      // Step 1: Pre-deployment checks
      await this.addDeploymentStep(deployment, 'pre_check', async () => {
        console.log('  🔍 Running pre-deployment checks...');

        // Check if previous deployment is still running
        const runningDeployments = this.deploymentHistory.filter(
          (d) => d.status === 'in_progress' && d.id !== deploymentId,
        );

        if (runningDeployments.length > 0) {
          throw new Error('Another deployment is currently in progress');
        }

        return { status: 'passed' };
      });

      // Step 2: Build and prepare
      await this.addDeploymentStep(deployment, 'build', async () => {
        console.log('  🏗️ Building application...');

        const { stdout } = await execAsync('npm run build', {
          cwd: root,
          timeout: 300000,
        });

        return {
          status: 'completed',
          output: stdout,
        };
      });

      // Step 3: Deploy based on environment
      if (environment === 'local') {
        await this.deployLocal(deployment);
      } else if (environment === 'staging') {
        await this.deployStagingDocker(deployment, version);
      } else if (environment === 'production') {
        await this.deployProduction(deployment, version);
      }

      // Step 4: Health checks
      if (!skipHealthCheck) {
        await this.addDeploymentStep(deployment, 'health_check', async () => {
          console.log('  🏥 Running health checks...');

          // Wait for deployment to stabilize
          await this.sleep(10000);

          const healthResults = await this.runHealthChecks(env.url);

          if (!healthResults.healthy) {
            throw new Error(`Health checks failed: ${healthResults.error}`);
          }

          return healthResults;
        });
      }

      // Step 5: Post-deployment verification
      await this.addDeploymentStep(deployment, 'verification', async () => {
        console.log('  ✅ Running post-deployment verification...');

        // Run smoke tests
        const smokeResults = await this.runSmokeTests(env.url);

        return smokeResults;
      });

      // Mark deployment as successful
      deployment.status = 'completed';
      deployment.endTime = new Date().toISOString();
      deployment.duration = Date.now() - startTime;

      console.log(`✅ Deployment ${deploymentId} completed successfully!`);
      console.log(`   Environment: ${env.name}`);
      console.log(`   Version: ${version}`);
      console.log(`   Duration: ${(deployment.duration / 1000).toFixed(2)}s`);
      console.log(`   URL: ${env.url}`);

      this.saveDeploymentHistory();

      return deployment;
    } catch (error) {
      // Mark deployment as failed
      const deployment = this.deploymentHistory.find(
        (d) => d.id === deploymentId,
      );
      if (deployment) {
        deployment.status = 'failed';
        deployment.error = error.message;
        deployment.endTime = new Date().toISOString();
        deployment.duration = Date.now() - startTime;
      }

      console.log(`❌ Deployment ${deploymentId} failed: ${error.message}`);

      this.saveDeploymentHistory();
      throw error;
    }
  }

  async deployLocal(deployment) {
    await this.addDeploymentStep(deployment, 'local_deploy', async () => {
      console.log('  🏠 Starting local development server...');

      // For local deployment, we just start the dev server
      const devProcess = spawn('npm', ['run', 'dev'], {
        cwd: root,
        stdio: 'pipe',
        detached: true,
      });

      // Wait a bit for server to start
      await this.sleep(5000);

      return {
        status: 'started',
        pid: devProcess.pid,
        url: 'http://localhost:5173',
      };
    });
  }

  async deployStagingDocker(deployment, version) {
    await this.addDeploymentStep(deployment, 'docker_deploy', async () => {
      console.log('  🐳 Deploying with Docker Compose...');

      // Build and deploy using staging compose file
      const composeFile = join(this.configDir, 'docker-compose.staging.yml');

      const { stdout } = await execAsync(
        `docker-compose -f "${composeFile}" up --build -d`,
        { cwd: root, timeout: 600000 },
      );

      return {
        status: 'deployed',
        output: stdout,
      };
    });
  }

  async deployProduction(deployment, version) {
    await this.addDeploymentStep(deployment, 'production_deploy', async () => {
      console.log('  🏭 Deploying to production...');

      // This would typically integrate with your production deployment system
      // For example: Kubernetes, AWS ECS, Google Cloud Run, etc.

      // Example using kubectl (if Kubernetes manifests exist)
      const k8sDir = join(this.configDir, 'kubernetes');
      if (existsSync(k8sDir)) {
        const { stdout } = await execAsync(`kubectl apply -f "${k8sDir}"`, {
          timeout: 300000,
        });

        return {
          status: 'deployed',
          method: 'kubernetes',
          output: stdout,
        };
      }

      // Example using Docker Compose for production
      const composeFile = join(this.configDir, 'docker-compose.production.yml');
      if (existsSync(composeFile)) {
        const { stdout } = await execAsync(
          `docker-compose -f "${composeFile}" up --build -d`,
          { cwd: root, timeout: 600000 },
        );

        return {
          status: 'deployed',
          method: 'docker-compose',
          output: stdout,
        };
      }

      throw new Error('No production deployment configuration found');
    });
  }

  async runHealthChecks(baseUrl) {
    try {
      const healthUrl = `${baseUrl}/health`;
      const response = await fetch(healthUrl);

      if (response.ok) {
        return {
          healthy: true,
          status: response.status,
          url: healthUrl,
        };
      } else {
        return {
          healthy: false,
          status: response.status,
          error: `HTTP ${response.status}`,
          url: healthUrl,
        };
      }
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        url: baseUrl,
      };
    }
  }

  async runSmokeTests(baseUrl) {
    console.log(`    🧪 Running smoke tests against ${baseUrl}...`);

    try {
      // Run basic smoke tests
      const tests = [
        { name: 'homepage', url: baseUrl },
        { name: 'login', url: `${baseUrl}/maestro/login` },
      ];

      const results = [];

      for (const test of tests) {
        try {
          const response = await fetch(test.url);
          results.push({
            name: test.name,
            url: test.url,
            status: response.status,
            passed: response.ok,
          });
        } catch (error) {
          results.push({
            name: test.name,
            url: test.url,
            error: error.message,
            passed: false,
          });
        }
      }

      const passedTests = results.filter((r) => r.passed).length;
      const totalTests = results.length;

      return {
        passed: passedTests === totalTests,
        results,
        summary: `${passedTests}/${totalTests} tests passed`,
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message,
      };
    }
  }

  async addDeploymentStep(deployment, stepName, stepFunction) {
    const step = {
      name: stepName,
      startTime: new Date().toISOString(),
      status: 'in_progress',
    };

    deployment.steps.push(step);

    try {
      const result = await stepFunction();
      step.status = 'completed';
      step.endTime = new Date().toISOString();
      step.result = result;
      return result;
    } catch (error) {
      step.status = 'failed';
      step.endTime = new Date().toISOString();
      step.error = error.message;
      throw error;
    }
  }

  generateDeploymentId() {
    return `deploy-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
  }

  async rollback(environment, deploymentId = null) {
    console.log(`🔄 Rolling back ${environment}...`);

    // Find the deployment to rollback to
    let targetDeployment;

    if (deploymentId) {
      targetDeployment = this.deploymentHistory.find(
        (d) => d.id === deploymentId,
      );
      if (!targetDeployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }
    } else {
      // Find the last successful deployment
      targetDeployment = this.deploymentHistory.find(
        (d) =>
          d.environment === environment &&
          d.status === 'completed' &&
          !d.rollback,
      );

      if (!targetDeployment) {
        throw new Error(`No successful deployment found for ${environment}`);
      }
    }

    console.log(
      `Rolling back to deployment ${targetDeployment.id} (${targetDeployment.version})`,
    );

    // Perform rollback deployment
    return await this.deploy(environment, {
      version: targetDeployment.version,
      rollback: true,
      approve: true, // Auto-approve rollbacks
    });
  }

  async generateReport() {
    console.log('📄 Generating deployment report...');

    const totalDuration = Date.now() - this.startTime;
    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      deploymentHistory: this.deploymentHistory.slice(0, 10), // Last 10 deployments
      environments: this.environments,
      summary: {
        totalDeployments: this.deploymentHistory.length,
        successfulDeployments: this.deploymentHistory.filter(
          (d) => d.status === 'completed',
        ).length,
        failedDeployments: this.deploymentHistory.filter(
          (d) => d.status === 'failed',
        ).length,
        inProgressDeployments: this.deploymentHistory.filter(
          (d) => d.status === 'in_progress',
        ).length,
      },
    };

    // Write JSON report
    writeFileSync(
      join(this.reportDir, 'deployment-report.json'),
      JSON.stringify(report, null, 2),
    );

    // Write HTML report
    const htmlReport = this.generateHTMLReport(report);
    writeFileSync(join(this.reportDir, 'deployment-report.html'), htmlReport);

    return report;
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deployment Report</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; background: #f8f9fa; line-height: 1.6; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric.successful .metric-value { color: #28a745; }
        .metric.failed .metric-value { color: #dc3545; }
        .metric.in-progress .metric-value { color: #ffc107; }
        .metric-label { font-size: 1em; color: #666; }
        .deployments { margin: 30px 0; }
        .deployment { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .deployment.completed { border-left: 4px solid #28a745; }
        .deployment.failed { border-left: 4px solid #dc3545; }
        .deployment.in_progress { border-left: 4px solid #ffc107; }
        .deployment-header { display: flex; justify-content: between; align-items: center; margin-bottom: 15px; }
        .deployment-id { font-family: monospace; background: #e9ecef; padding: 2px 6px; border-radius: 4px; }
        .steps { margin: 15px 0; }
        .step { background: white; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin: 5px 0; font-size: 0.9em; }
        .step.completed { border-left: 3px solid #28a745; }
        .step.failed { border-left: 3px solid #dc3545; }
        .step.in_progress { border-left: 3px solid #ffc107; }
        .environments { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
        .environment { background: #e3f2fd; padding: 20px; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Deployment Report</h1>
            <p><strong>Generated:</strong> ${report.timestamp}</p>
            <p><strong>Report Duration:</strong> ${(report.duration / 1000).toFixed(2)} seconds</p>
        </div>
        
        <h2>📊 Summary</h2>
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.summary.totalDeployments}</div>
                <div class="metric-label">Total Deployments</div>
            </div>
            <div class="metric successful">
                <div class="metric-value">${report.summary.successfulDeployments}</div>
                <div class="metric-label">Successful</div>
            </div>
            <div class="metric failed">
                <div class="metric-value">${report.summary.failedDeployments}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric in-progress">
                <div class="metric-value">${report.summary.inProgressDeployments}</div>
                <div class="metric-label">In Progress</div>
            </div>
        </div>
        
        <h2>🌍 Environments</h2>
        <div class="environments">
            ${Object.entries(report.environments)
              .map(
                ([env, config]) => `
                <div class="environment">
                    <h3>${env.charAt(0).toUpperCase() + env.slice(1)}</h3>
                    <p><strong>Name:</strong> ${config.name}</p>
                    <p><strong>URL:</strong> <a href="${config.url}" target="_blank">${config.url}</a></p>
                    <p><strong>Requires Auth:</strong> ${config.requiresAuth ? 'Yes' : 'No'}</p>
                    ${config.requiresApproval ? '<p><strong>Requires Approval:</strong> Yes</p>' : ''}
                </div>
            `,
              )
              .join('')}
        </div>
        
        <h2>📋 Recent Deployments</h2>
        <div class="deployments">
            ${report.deploymentHistory
              .map(
                (deployment) => `
                <div class="deployment ${deployment.status}">
                    <div class="deployment-header">
                        <div>
                            <h3>
                                <span class="deployment-id">${deployment.id}</span>
                                ${deployment.environment} - ${deployment.version}
                            </h3>
                            <p><strong>Status:</strong> ${deployment.status.toUpperCase()}</p>
                            <p><strong>Started:</strong> ${deployment.startTime}</p>
                            ${deployment.endTime ? `<p><strong>Duration:</strong> ${(deployment.duration / 1000).toFixed(2)}s</p>` : ''}
                            ${deployment.rollback ? '<p><strong>Type:</strong> Rollback</p>' : ''}
                        </div>
                    </div>
                    
                    ${
                      deployment.error
                        ? `
                        <div style="background: #f8d7da; padding: 10px; border-radius: 4px; margin: 10px 0;">
                            <strong>Error:</strong> ${deployment.error}
                        </div>
                    `
                        : ''
                    }
                    
                    ${
                      deployment.steps && deployment.steps.length > 0
                        ? `
                        <div class="steps">
                            <strong>Steps:</strong>
                            ${deployment.steps
                              .map(
                                (step) => `
                                <div class="step ${step.status}">
                                    <strong>${step.name.replace(/_/g, ' ').toUpperCase()}</strong> - ${step.status.toUpperCase()}
                                    ${step.error ? `<br><span style="color: #dc3545;">Error: ${step.error}</span>` : ''}
                                </div>
                            `,
                              )
                              .join('')}
                        </div>
                    `
                        : ''
                    }
                </div>
            `,
              )
              .join('')}
        </div>
    </div>
</body>
</html>
    `;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async run(command, options = {}) {
    try {
      await this.setup();

      switch (command) {
        case 'create-configs':
          await this.createDockerDeployment();
          await this.createKubernetesDeployment();
          console.log('✅ All deployment configurations created!');
          break;

        case 'deploy':
          const environment = options.environment || 'local';
          return await this.deploy(environment, options);

        case 'rollback':
          const rollbackEnv = options.environment || 'staging';
          return await this.rollback(rollbackEnv, options.deploymentId);

        case 'status':
          const report = await this.generateReport();
          console.log('\n📊 Deployment Status:');
          console.log(
            `  Total Deployments: ${report.summary.totalDeployments}`,
          );
          console.log(`  Successful: ${report.summary.successfulDeployments}`);
          console.log(`  Failed: ${report.summary.failedDeployments}`);
          console.log(`  In Progress: ${report.summary.inProgressDeployments}`);
          break;

        default:
          throw new Error(`Unknown command: ${command}`);
      }
    } catch (error) {
      console.error('❌ Deployment Manager failed:', error);
      throw error;
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0] || 'create-configs';

  const options = {
    environment: args.find((arg) => arg.startsWith('--env='))?.split('=')[1],
    version:
      args.find((arg) => arg.startsWith('--version='))?.split('=')[1] ||
      'latest',
    deploymentId: args
      .find((arg) => arg.startsWith('--deployment='))
      ?.split('=')[1],
    skipHealthCheck: args.includes('--skip-health-check'),
    approve: args.includes('--approve'),
  };

  const manager = new DeploymentManager();
  manager
    .run(command, options)
    .then(() => {
      console.log('✅ Deployment Manager completed successfully!');
    })
    .catch((error) => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}

export default DeploymentManager;

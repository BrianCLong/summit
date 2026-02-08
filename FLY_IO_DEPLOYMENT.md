# Fly.io Deployment for Summit Application

This guide will walk you through deploying the Summit application to Fly.io using their free tier.

## Prerequisites

1. A Fly.io account (sign up at https://fly.io)
2. Flyctl installed on your system
3. A domain name (topicality.co) ready for configuration

## Step 1: Install Flyctl

```bash
# For Linux/macOS
curl -L https://fly.io/install.sh | sh

# Add to PATH if needed
export PATH="$HOME/.fly/bin:$PATH"
```

## Step 2: Authenticate with Fly.io

```bash
fly auth login
```

## Step 3: Create Fly Apps for Each Summit Component

Summit consists of multiple services, so we'll create separate Fly apps for each:

### Create PostgreSQL App
```bash
# Initialize PostgreSQL app
fly apps create summit-postgres-free

# Launch with PostgreSQL
fly postgres create --name summit-postgres-free --region ord
```

### Create Redis App
```bash
# Initialize Redis app
fly apps create summit-redis-free

# Launch with Redis (using a community image)
fly launch --name summit-redis-free --region ord --image library/redis:7-alpine
```

### Create Neo4j App
```bash
# Initialize Neo4j app
fly apps create summit-neo4j-free

# Launch with Neo4j
fly launch --name summit-neo4j-free --region ord --image neo4j:2025.01-enterprise
```

## Step 4: Configure Environment Variables

For each service, you'll need to set environment variables:

```bash
# For Neo4j
fly secrets set -a summit-neo4j-free NEO4J_AUTH=neo4j:summit_neo4j_password --remote-only

# For PostgreSQL (the connection details will be provided after creation)
fly secrets set -a summit-postgres-free POSTGRES_DB=intelgraph POSTGRES_USER=intelgraph_user POSTGRES_PASSWORD=summit_postgres_password --remote-only
```

## Step 5: Deploy Summit Server

Create a fly.toml for the Summit server:

```toml
# fly.toml for Summit Server
app = "summit-server-free"
primary_region = "ord"

[build]
  dockerfile = "server/Dockerfile"

[env]
  NODE_ENV = "production"
  DATABASE_URL = "postgresql://intelgraph_user:summit_postgres_password@topicality-db.internal:5432/intelgraph"
  NEO4J_URI = "bolt://topicality-neo4j.internal:7687"
  REDIS_URL = "redis://topicality-redis.internal:6379"
  JWT_SECRET = "your-generated-jwt-secret"
  SESSION_SECRET = "your-generated-session-secret"

[[services]]
  http_checks = []
  internal_port = 4000
  protocol = "tcp"
  script_checks = []

  [services.concurrency]
    hard_limit = 25
    soft_limit = 20
    type = "connections"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "1s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"
```

Deploy the server:
```bash
fly deploy --config fly-server.toml
```

## Step 6: Deploy Summit Web Interface

Create a fly.toml for the web interface:

```toml
# fly.toml for Summit Web
app = "summit-web-free"
primary_region = "ord"

[build]
  dockerfile = "apps/web/Dockerfile"

[env]
  VITE_API_URL = "https://summit-server-free.fly.dev/api"
  VITE_WS_URL = "wss://summit-server-free.fly.dev/api"

[[services]]
  http_checks = []
  internal_port = 3000
  protocol = "tcp"
  script_checks = []

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

Deploy the web interface:
```bash
fly deploy --config fly-web.toml
```

## Step 7: Configure Your Domain

Add your domain to Fly.io:

```bash
fly ips allocate-v4 --app summit-web-free
fly certs add topicality.co --app summit-web-free
```

Update your DNS provider to point topicality.co to the IP addresses provided by Fly.io:

```bash
fly ips list --app summit-web-free
```

## Step 8: Verify Deployment

Check that all services are running:

```bash
fly status --app summit-server-free
fly status --app summit-web-free
fly status --app summit-postgres-free
fly status --app summit-neo4j-free
fly status --app summit-redis-free
```

## Important Notes

- Fly.io's free tier includes 3 shared CPU machines with 1GB of RAM each
- You get 3GB of persistent volume storage
- Bandwidth is limited but generous for most applications
- The free tier supports up to 3 apps
- For Summit's multiple services, you may need to combine some services or upgrade later

## Troubleshooting

If you encounter issues:

1. Check app status: `fly status -a <app-name>`
2. View logs: `fly logs -a <app-name>`
3. SSH into machine: `fly ssh console -a <app-name>`

## Scaling Beyond Free Tier

As your usage grows, you can scale by:
- Adding more machines to your apps
- Increasing VM resources
- Using paid add-ons for databases
- Upgrading to a paid plan

This setup will get Summit running on Fly.io's free tier with your topicality.co domain.
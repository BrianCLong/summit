# Troubleshooting Guide Template

## Purpose
This guide helps developers diagnose and resolve common issues when developing, deploying, or operating the Summit/IntelGraph platform.

---

## Table of Contents
1. [Local Development Issues](#local-development-issues)
2. [Build & Deployment Issues](#build--deployment-issues)
3. [Database Issues](#database-issues)
4. [Network & Connectivity](#network--connectivity)
5. [Performance Issues](#performance-issues)
6. [Authentication Issues](#authentication-issues)
7. [Container & Kubernetes Issues](#container--kubernetes-issues)
8. [Debugging Tools](#debugging-tools)

---

## Local Development Issues

### ❌ `pnpm install` Fails

**Symptom:**
```
ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/[package]: Not Found
```

**Common Causes:**
1. Package name typo in `package.json`
2. Private package without authentication
3. Network/proxy issues
4. Incompatible Node.js version

**Solutions:**

1. **Verify Node.js version:**
   ```bash
   node --version  # Should be >= 20.x
   nvm use 20      # If using nvm
   ```

2. **Clear pnpm cache:**
   ```bash
   pnpm store prune
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

3. **Check for private packages:**
   ```bash
   # Authenticate with GitHub Packages (if using @org/package)
   echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" > ~/.npmrc
   ```

4. **Check proxy settings:**
   ```bash
   # Remove proxy if set incorrectly
   npm config delete proxy
   npm config delete https-proxy
   ```

---

### ❌ Docker Compose Services Won't Start

**Symptom:**
```
ERROR: for neo4j  Cannot start service neo4j: Ports are not available
```

**Common Causes:**
1. Ports already in use
2. Docker daemon not running
3. Insufficient resources (memory/CPU)
4. Volume mount issues

**Solutions:**

1. **Check if port is in use:**
   ```bash
   lsof -i :7687  # Neo4j port
   lsof -i :5432  # PostgreSQL port
   lsof -i :6379  # Redis port
   ```

2. **Kill conflicting process:**
   ```bash
   kill -9 $(lsof -t -i :7687)
   ```

3. **Check Docker resources:**
   ```bash
   docker info | grep -i memory
   docker info | grep -i cpu
   ```
   - **Solution:** Increase Docker Desktop resources (Preferences → Resources)

4. **Rebuild containers:**
   ```bash
   docker-compose down -v  # Remove volumes
   docker-compose up --build --force-recreate
   ```

---

### ❌ Hot Module Replacement (HMR) Not Working

**Symptom:**
- Code changes don't reflect in browser
- Need to manually refresh

**Common Causes:**
1. Vite/Webpack not watching files
2. Too many files (inotify limit on Linux)
3. File system issues (NFS, Docker volume)

**Solutions:**

1. **Increase inotify watchers (Linux):**
   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. **Check Vite config:**
   ```javascript
   // vite.config.ts
   export default {
     server: {
       watch: {
         usePolling: true,  // For Docker/NFS
       }
     }
   }
   ```

3. **Restart dev server:**
   ```bash
   pnpm run dev
   ```

---

### ❌ TypeScript Errors After Pulling Latest Code

**Symptom:**
```
TS2307: Cannot find module '@intelgraph/types' or its corresponding type declarations.
```

**Common Causes:**
1. New dependencies not installed
2. Generated types not built
3. TypeScript cache corruption

**Solutions:**

1. **Reinstall dependencies:**
   ```bash
   pnpm install
   ```

2. **Build internal packages:**
   ```bash
   pnpm run build:packages  # Build @intelgraph/* packages
   ```

3. **Clear TypeScript cache:**
   ```bash
   rm -rf node_modules/.cache
   rm -rf .turbo
   pnpm run typecheck
   ```

---

## Build & Deployment Issues

### ❌ Docker Build Fails

**Symptom:**
```
ERROR [build 3/8] RUN pnpm install --frozen-lockfile
executor failed running [/bin/sh -c pnpm install]: exit code 1
```

**Common Causes:**
1. Outdated `pnpm-lock.yaml`
2. Platform-specific dependencies
3. Build context issues

**Solutions:**

1. **Update lockfile:**
   ```bash
   pnpm install
   git add pnpm-lock.yaml
   git commit -m "chore: update pnpm-lock.yaml"
   ```

2. **Use buildx for multi-platform:**
   ```bash
   docker buildx build --platform linux/amd64,linux/arm64 -t myimage:latest .
   ```

3. **Clear Docker build cache:**
   ```bash
   docker builder prune -a
   ```

4. **Check .dockerignore:**
   ```bash
   # Ensure these are in .dockerignore
   node_modules
   .git
   .env
   ```

---

### ❌ Kubernetes Pod in CrashLoopBackOff

**Symptom:**
```bash
NAME                    READY   STATUS             RESTARTS   AGE
api-gateway-6d8f7b-xyz  0/1     CrashLoopBackOff   5          3m
```

**Common Causes:**
1. Application startup failure
2. Missing environment variables
3. Health check failures
4. Resource limits too low

**Solutions:**

1. **Check logs:**
   ```bash
   kubectl logs api-gateway-6d8f7b-xyz
   kubectl logs api-gateway-6d8f7b-xyz --previous  # Previous crash
   ```

2. **Check events:**
   ```bash
   kubectl describe pod api-gateway-6d8f7b-xyz
   ```

3. **Check environment variables:**
   ```bash
   kubectl exec -it api-gateway-6d8f7b-xyz -- env | grep -i [VAR_NAME]
   ```

4. **Increase resource limits:**
   ```yaml
   # deployment.yaml
   resources:
     limits:
       memory: "2Gi"  # Increase from 512Mi
       cpu: "1000m"   # Increase from 500m
   ```

5. **Disable health checks temporarily:**
   ```yaml
   # deployment.yaml
   # Comment out livenessProbe and readinessProbe
   ```

---

## Database Issues

### ❌ Cannot Connect to PostgreSQL

**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Common Causes:**
1. PostgreSQL not running
2. Wrong connection string
3. Firewall/network issues
4. Authentication failure

**Solutions:**

1. **Check if PostgreSQL is running:**
   ```bash
   # Docker Compose
   docker-compose ps postgres

   # Kubernetes
   kubectl get pods -l app=postgres
   ```

2. **Verify connection string:**
   ```bash
   # Should match this format:
   postgresql://user:password@host:5432/database

   # Test connection
   psql postgresql://postgres:password@localhost:5432/intelgraph
   ```

3. **Check pg_hba.conf:**
   ```bash
   docker exec -it postgres cat /var/lib/postgresql/data/pg_hba.conf
   # Ensure: host all all 0.0.0.0/0 md5
   ```

4. **Port forward (Kubernetes):**
   ```bash
   kubectl port-forward svc/postgres 5432:5432
   ```

---

### ❌ Neo4j Connection Timeout

**Symptom:**
```
ServiceUnavailable: WebSocket connection failure
```

**Common Causes:**
1. Neo4j not fully started
2. Wrong URI (bolt:// vs neo4j://)
3. Authentication failure
4. Network issues

**Solutions:**

1. **Check Neo4j status:**
   ```bash
   # Docker
   docker logs neo4j

   # Should see: "Remote interface available at http://localhost:7474/"
   ```

2. **Verify URI format:**
   ```bash
   # Correct formats:
   NEO4J_URI=bolt://localhost:7687       # Single instance
   NEO4J_URI=neo4j://localhost:7687      # Clustered
   NEO4J_URI=neo4j+s://neo4j.cloud:7687  # Neo4j Aura
   ```

3. **Test connection:**
   ```bash
   docker exec -it neo4j cypher-shell -u neo4j -p password "RETURN 1;"
   ```

4. **Check authentication:**
   ```bash
   # Reset password
   docker exec -it neo4j cypher-shell -u neo4j -p neo4j
   # Will prompt to change password
   ```

---

### ❌ Database Migration Fails

**Symptom:**
```
Error: Migration "20240101_add_users_table" failed
```

**Common Causes:**
1. Schema conflicts
2. Missing permissions
3. Previous migration not completed
4. Data integrity issues

**Solutions:**

1. **Check migration status:**
   ```bash
   pnpm run migrate:status
   ```

2. **Rollback and retry:**
   ```bash
   pnpm run migrate:down  # Rollback last migration
   pnpm run migrate:up    # Re-run migrations
   ```

3. **Check database permissions:**
   ```sql
   -- PostgreSQL
   SELECT grantee, privilege_type
   FROM information_schema.role_table_grants
   WHERE table_name='your_table';
   ```

4. **Manual fix (last resort):**
   ```bash
   psql -h localhost -U postgres -d intelgraph
   # Manually inspect and fix schema issues
   ```

---

## Network & Connectivity

### ❌ API Requests Timing Out

**Symptom:**
```
Error: timeout of 30000ms exceeded
```

**Common Causes:**
1. Service not running
2. Network/firewall blocking
3. Slow database query
4. Resource exhaustion

**Solutions:**

1. **Check service health:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check service logs:**
   ```bash
   docker logs api-gateway --tail=50
   ```

3. **Increase timeout (temporarily):**
   ```javascript
   // In your API client
   axios.get('/api/data', { timeout: 60000 })  // 60 seconds
   ```

4. **Check for slow queries:**
   ```bash
   # PostgreSQL slow query log
   docker exec -it postgres psql -U postgres -d intelgraph -c "
   SELECT pid, now() - query_start AS duration, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY duration DESC
   LIMIT 10;"
   ```

---

### ❌ CORS Errors in Browser

**Symptom:**
```
Access to fetch at 'http://localhost:3000/api' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**Common Causes:**
1. Backend not configured for CORS
2. Wrong origin URL
3. Credentials not allowed

**Solutions:**

1. **Enable CORS in backend:**
   ```javascript
   // Express.js
   const cors = require('cors');
   app.use(cors({
     origin: 'http://localhost:5173',  // Vite dev server
     credentials: true
   }));
   ```

2. **Use proxy in development:**
   ```javascript
   // vite.config.ts
   export default {
     server: {
       proxy: {
         '/api': 'http://localhost:3000'
       }
     }
   }
   ```

3. **Check browser console:**
   - Look for preflight OPTIONS request failures

---

## Performance Issues

### ❌ GraphQL Query Very Slow

**Symptom:**
- Query takes > 5 seconds
- Frontend times out

**Common Causes:**
1. Missing database indexes
2. N+1 query problem
3. Large result sets without pagination
4. Expensive resolvers

**Solutions:**

1. **Enable GraphQL query logging:**
   ```javascript
   // In Apollo Server config
   plugins: [
     {
       requestDidStart() {
         const start = Date.now();
         return {
           willSendResponse({ metrics }) {
             console.log(`Query took ${Date.now() - start}ms`);
           }
         }
       }
     }
   ]
   ```

2. **Use DataLoader to batch queries:**
   ```javascript
   const userLoader = new DataLoader(async (ids) => {
     return await User.findByIds(ids);
   });
   ```

3. **Add pagination:**
   ```graphql
   query {
     entities(first: 20, after: "cursor") {
       edges {
         node { id name }
       }
       pageInfo { hasNextPage endCursor }
     }
   }
   ```

4. **Check Neo4j query plan:**
   ```cypher
   EXPLAIN MATCH (n:Entity)-[:RELATES_TO]->(m) RETURN n, m;
   ```

---

### ❌ Frontend Bundle Too Large

**Symptom:**
- Initial load > 5MB
- Slow page load

**Common Causes:**
1. Not using code splitting
2. Including entire libraries (e.g., lodash, moment)
3. Large images not optimized
4. Source maps in production

**Solutions:**

1. **Analyze bundle:**
   ```bash
   pnpm run build
   pnpm exec vite-bundle-visualizer
   ```

2. **Enable code splitting:**
   ```javascript
   // Use dynamic imports
   const HeavyComponent = lazy(() => import('./HeavyComponent'));
   ```

3. **Use tree-shaking imports:**
   ```javascript
   // ❌ Bad
   import _ from 'lodash';

   // ✅ Good
   import debounce from 'lodash/debounce';
   ```

4. **Disable source maps in production:**
   ```javascript
   // vite.config.ts
   export default {
     build: {
       sourcemap: false
     }
   }
   ```

---

## Authentication Issues

### ❌ JWT Token Invalid

**Symptom:**
```
Error: JsonWebTokenError: invalid token
```

**Common Causes:**
1. Token expired
2. Wrong secret key
3. Token format invalid
4. Clock skew between services

**Solutions:**

1. **Verify token format:**
   ```bash
   # Should be: header.payload.signature
   echo "eyJhbGciOi..." | cut -d. -f1 | base64 -d
   ```

2. **Check expiration:**
   ```javascript
   const jwt = require('jsonwebtoken');
   const decoded = jwt.decode(token);
   console.log('Expires:', new Date(decoded.exp * 1000));
   ```

3. **Verify secret key:**
   ```bash
   # Ensure JWT_SECRET matches across services
   echo $JWT_SECRET
   ```

4. **Allow clock skew:**
   ```javascript
   jwt.verify(token, secret, { clockTolerance: 60 });  // 60 seconds
   ```

---

### ❌ OPA Policy Denies Request

**Symptom:**
```
403 Forbidden: Policy evaluation failed
```

**Common Causes:**
1. User missing required role/permission
2. Policy logic error
3. OPA bundle not loaded
4. Wrong input data format

**Solutions:**

1. **Test policy locally:**
   ```bash
   # Test with sample input
   opa eval -d policies/ -i input.json "data.authz.allow"
   ```

2. **Check OPA logs:**
   ```bash
   kubectl logs -l app=opa --tail=50
   ```

3. **Verify policy bundle:**
   ```bash
   kubectl exec -it opa-0 -- wget -O- http://localhost:8181/v1/policies
   ```

4. **Debug with decision logs:**
   ```bash
   # Enable decision logging in OPA config
   decision_logs:
     console: true
   ```

---

## Container & Kubernetes Issues

### ❌ ImagePullBackOff

**Symptom:**
```bash
NAME                READY   STATUS             RESTARTS   AGE
api-gateway-xyz     0/1     ImagePullBackOff   0          2m
```

**Common Causes:**
1. Image doesn't exist
2. Registry authentication failure
3. Image tag wrong
4. Private registry not configured

**Solutions:**

1. **Check image exists:**
   ```bash
   docker pull [image-name]:[tag]
   ```

2. **Verify image in deployment:**
   ```bash
   kubectl describe pod api-gateway-xyz | grep Image
   ```

3. **Create image pull secret:**
   ```bash
   kubectl create secret docker-registry regcred \
     --docker-server=[registry] \
     --docker-username=[user] \
     --docker-password=[token]

   # Add to deployment
   spec:
     imagePullSecrets:
       - name: regcred
   ```

4. **Check registry credentials:**
   ```bash
   kubectl get secret regcred -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d
   ```

---

## Debugging Tools

### Essential Commands

#### Docker
```bash
# View logs
docker logs [container] --tail=100 --follow

# Execute command in container
docker exec -it [container] bash

# Inspect container
docker inspect [container]

# Check resource usage
docker stats
```

#### Kubernetes
```bash
# View pod logs
kubectl logs [pod] -f

# Execute command in pod
kubectl exec -it [pod] -- bash

# Port forward
kubectl port-forward [pod] 8080:8080

# Describe pod (events, status)
kubectl describe pod [pod]

# View resource usage
kubectl top pods
kubectl top nodes
```

#### Database
```bash
# PostgreSQL
docker exec -it postgres psql -U postgres -d intelgraph

# Neo4j
docker exec -it neo4j cypher-shell -u neo4j -p password

# Redis
docker exec -it redis redis-cli
```

#### Network
```bash
# Test connectivity
curl -v http://localhost:3000/health

# DNS lookup
nslookup api-gateway.default.svc.cluster.local

# Trace route
traceroute api-gateway.example.com
```

---

## Getting Help

### Before Asking for Help
1. ✅ Check this troubleshooting guide
2. ✅ Search existing issues/tickets
3. ✅ Review logs for error messages
4. ✅ Try restarting the service

### Where to Ask
- **Slack:** `#engineering-help`
- **GitHub Issues:** `[Repo URL]/issues`
- **On-Call:** Page via PagerDuty for production issues

### What to Include
- ❗ **Error message** (full stack trace)
- ❗ **Steps to reproduce**
- ❗ **Environment** (local/staging/production)
- ❗ **What you've tried already**
- ❗ **Relevant logs** (use pastebin for large logs)

---

## Additional Resources

- **Main Documentation:** `/docs/README.md`
- **Architecture:** `/docs/ARCHITECTURE.md`
- **Runbooks:** `/docs/runbooks/`
- **API Docs:** `[GraphQL Playground URL]`

**Remember: Most issues have been seen before. Check logs first, search docs second, ask for help third!**

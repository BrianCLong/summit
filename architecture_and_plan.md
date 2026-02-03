# Summit Platform - Production Architecture & Migration Plan

## 1. Executive Summary & Reconciliation

The **Summit Platform** (IntelGraph) consists of two primary logical subsystems that must be unified in production:

1.  **IntelGraph Core (Node.js/Graph Stack):**
    *   **Services:** `prov-ledger` (Provenance), `policy-lac` (Policy), `nl2cypher` (AI), `report-studio` (Frontend).
    *   **Data:** Neo4j (Graph), Postgres (Relational), Redis (Cache).
    *   **Architecture:** Microservices interacting via REST/GraphQL.

2.  **Maestro (Python/FastAPI):**
    *   **Role:** Orchestration and run tracking.
    *   **Dependencies:** Imports from shared `api/` module.
    *   **Integration:** Co-located in the same compute cluster for low-latency access to shared resources.

**Decision:** The "Split-Brain" architecture (EC2 scripts vs. Local Docker) is resolved by moving **ALL** workloads to **AWS EKS**. This provides a single control plane for both Node.js and Python services, simplifies networking, and utilizes managed data stores.

## 2. Production Architecture (AWS)

```mermaid
graph TD
    User[User/Client] -->|HTTPS| ALB[AWS Application Load Balancer]
    
    subgraph "AWS VPC"
        subgraph "EKS Cluster (Private Subnets)"
            Ingress[Ingress Controller]
            
            subgraph "Services Namespace"
                Maestro[Maestro Service (Python)]
                Prov[Prov-Ledger (Node)]
                Policy[Policy-LAC (Node)]
                NL2Cypher[NL2Cypher (Node/AI)]
                Frontend[Report Studio (React/Node)]
            end
            
            subgraph "Stateful Namespace"
                Neo4j[Neo4j 5.x Cluster]
            end
        end
        
        subgraph "Managed Data Services"
            Aurora[Amazon Aurora PostgreSQL v2]
            Redis[Amazon ElastiCache Redis]
        end
    end
    
    Maestro --> Aurora
    Prov --> Redis
    Prov --> Neo4j
    Policy --> Neo4j
    NL2Cypher --> Neo4j
```

### Key Components:
*   **Compute:** AWS EKS (Elastic Kubernetes Service).
*   **Database (Relational):** Amazon Aurora Serverless v2 (PostgreSQL) for `maestro` and `intelgraph` relational data.
*   **Database (Graph):** Self-Hosted Neo4j 5 Enterprise on EKS (via Helm) with persistent volume claims (EBS/EFS). *Note: Chosen over Neptune to ensure full Cypher compatibility with existing `nl2cypher` logic.*
*   **Cache:** Amazon ElastiCache (Redis).
*   **Ingress:** AWS Load Balancer Controller + Nginx Ingress.

## 3. Migration Plan (Zero -> Prod)

### Phase 1: Infrastructure Provisioning (Terraform)
1.  **Bootstrap:** Create VPC, Subnets, Internet Gateways.
2.  **Cluster:** Provision EKS Control Plane + Managed Node Groups.
3.  **Data:** Provision Aurora Cluster and ElastiCache Replication Group.
4.  **Secrets:** Initialize AWS Secrets Manager for DB credentials.

### Phase 2: Application Packaging
1.  **Dockerfiles:** Standardize builds for `maestro` (Python) and `prov-ledger` (Node).
2.  **Registry:** Create ECR repositories for each service.
3.  **CI/CD:** Implement GitHub Actions to build and push on merge.

### Phase 3: Deployment & Data
1.  **Helm Charts:** Deploy `neo4j` via official Helm chart.
2.  **Migrations:** Run `npm run db:migrate` (Postgres) and Cypher scripts (Neo4j) via k8s Jobs.
3.  **Services:** Deploy application stateless sets.
4.  **Cutover:** Update DNS (`topicality.co`) to point to the new ALB.

## 4. Runbooks

### Database Migration Failed
*   **Trigger:** CI/CD Job `db-migrate` fails.
*   **Action:**
    1.  Check logs: `kubectl logs job/db-migration-<id>`
    2.  If lock exists: `UPDATE DATABASECHANGELOGLOCK SET LOCKED=0;` (Liquibase/TypeORM equivalent).
    3.  Rollback: If breaking schema change, restore snapshot taken immediately before deploy.

### Smoke Test
```bash
# Public Health Check
curl -f https://api.topicality.co/health

# Internal Service Mesh Check (from bastion)
kubectl run -it --rm --restart=Never curl --image=curlimages/curl -- \
  http://maestro.default.svc.cluster.local:8001/health
```

#!/usr/bin/env python3

"""
Create GitHub Issues for IntelGraph MVP Roadmap
This script creates all the GitHub issues for phases 4-5+ with proper labels and milestones
"""

import os
from datetime import datetime, timedelta

import requests

# GitHub configuration
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO_OWNER = "brianlong"  # Update with your GitHub username
REPO_NAME = "intelgraph"
BASE_URL = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}"

headers = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json",
}

# Milestones to create
milestones = [
    {
        "title": "MVP-1: Production Ready",
        "description": "Core features needed for production deployment",
        "due_on": (datetime.now() + timedelta(days=30)).isoformat(),
    },
    {
        "title": "MVP-2: Advanced Features",
        "description": "AI/ML enhancements and advanced analytics",
        "due_on": (datetime.now() + timedelta(days=60)).isoformat(),
    },
    {
        "title": "MVP-3: Enterprise Scale",
        "description": "Enterprise features and federation capabilities",
        "due_on": (datetime.now() + timedelta(days=90)).isoformat(),
    },
]

# Labels to create
labels = [
    {"name": "phase-4", "color": "ff9500", "description": "Phase 4: Observability & Reliability"},
    {"name": "phase-5", "color": "ff0080", "description": "Phase 5: Advanced Features"},
    {"name": "observability", "color": "1d76db", "description": "Monitoring and observability"},
    {"name": "reliability", "color": "0e8a16", "description": "Reliability and resilience"},
    {"name": "ai-ml", "color": "b60205", "description": "AI/ML features"},
    {"name": "sre", "color": "fbca04", "description": "Site Reliability Engineering"},
    {"name": "epic", "color": "5319e7", "description": "Large feature epic"},
    {"name": "prod-mvp", "color": "e99695", "description": "Required for production MVP"},
]

# Issues to create
issues = [
    # Phase 4: Observability & Reliability
    {
        "title": "Add OpenTelemetry tracing and Prometheus metrics",
        "body": """## Description
Wire OpenTelemetry instrumentation throughout the GraphQL API and add Prometheus metrics for monitoring.

## Acceptance Criteria
- [ ] OpenTelemetry spans for GraphQL resolvers, Neo4j queries, Redis operations
- [ ] Resource attributes: service.name, deployment.env, version
- [ ] Browser traces with runId correlation  
- [ ] Prometheus metrics: API latency, cache hit/miss, queue depth, active users
- [ ] Grafana dashboard JSON included and tested
- [ ] Traces visible in Jaeger with proper correlation
- [ ] Performance impact < 5% overhead

## Technical Notes
- Use `@opentelemetry/api` and `@opentelemetry/sdk-node`
- Instrument Apollo Server with custom plugin
- Add custom spans for Copilot operations
- Export to OTLP endpoint (configurable)

## Implementation
Create `/server/src/monitoring/tracing.js` and `/server/src/monitoring/metrics.js`

## Priority
High - Required for production observability""",
        "labels": ["phase-4", "observability", "backend", "prod-mvp"],
        "milestone": "MVP-1: Production Ready",
    },
    {
        "title": "Complete smoke tests and CI/CD improvements",
        "body": """## Description
Implement comprehensive smoke tests and enhance CI/CD pipeline for production readiness.

## Acceptance Criteria
- [ ] Golden path smoke test runs end-to-end
- [ ] Smoke test covers: create investigation → add entities → import data → run Copilot → verify results
- [ ] CI fails if smoke test doesn't pass
- [ ] Performance regression testing
- [ ] Automated deployment to staging
- [ ] Health check endpoints for all services

## Technical Notes
- Extend existing `/scripts/smoke-test.js`
- Add to GitHub Actions workflow
- Use Docker health checks
- Add performance benchmarks

## Implementation
Complete `/scripts/smoke-test.js` and update CI workflows

## Priority
High - Required for reliable deployments""",
        "labels": ["phase-4", "ci-cd", "testing", "prod-mvp"],
        "milestone": "MVP-1: Production Ready",
    },
    {
        "title": "Add Graph Performance Mode with LOD/clustering",
        "body": """## Description
Implement performance optimizations for large graphs with Level-of-Detail rendering and clustering.

## Acceptance Criteria
- [ ] Performance mode toggle in UI
- [ ] Level-of-Detail (LOD) rendering based on zoom level
- [ ] Community detection clustering for large graphs
- [ ] Simplified styles and reduced detail at distance
- [ ] Smooth performance with 10k+ nodes
- [ ] Optional 3D visualization prototype behind feature flag
- [ ] Clustering algorithm documentation

## Technical Notes
- Use Cytoscape.js extensions for clustering
- Implement viewport-based culling
- Consider WebGL rendering for large datasets
- Add performance metrics dashboard

## Implementation
Update `/client/src/components/graph/` components

## Priority
Medium - Important for scale but not blocking production""",
        "labels": ["phase-4", "frontend", "performance"],
        "milestone": "MVP-1: Production Ready",
    },
    {
        "title": "Add gitleaks and Trivy security scans to CI pipeline",
        "body": """## Description
Integrate security scanning tools into the CI/CD pipeline to catch vulnerabilities early.

## Acceptance Criteria
- [ ] Gitleaks scan for secrets in commits
- [ ] Trivy scan for container vulnerabilities
- [ ] PR blocked on high severity issues
- [ ] Security baseline established and maintained
- [ ] False positive suppression configured
- [ ] Security scan results in PR comments

## Technical Notes
- Run in GitHub Actions workflow
- Cache scan results for performance
- Configure severity thresholds
- Add security review requirement for bypass

## Implementation
Create `.github/workflows/security-scan.yml`

## Priority
High - Security is critical for production""",
        "labels": ["phase-4", "security", "ci-cd", "prod-mvp"],
        "milestone": "MVP-1: Production Ready",
    },
    {
        "title": "Create comprehensive backup and disaster recovery procedures",
        "body": """## Description
Document and test backup/restore procedures for all data stores.

## Acceptance Criteria
- [ ] Postgres backup: pg_dump/pg_restore with automation
- [ ] Neo4j backup: neo4j-admin backup with scheduling
- [ ] Redis backup: RDB/AOF snapshots
- [ ] Cross-region backup replication tested
- [ ] Disaster recovery drill completed successfully
- [ ] Recovery time/point objectives documented
- [ ] Runbook tested by team member not involved in writing

## Technical Notes
- Automate with cron jobs or Kubernetes CronJobs
- Encrypt backups at rest and in transit
- Test restore procedures monthly
- Document RTO/RPO requirements

## Implementation
Create `/docs/runbooks/backup-dr.md` and `/scripts/backup/` directory

## Priority
High - Critical for production data safety""",
        "labels": ["phase-4", "sre", "documentation", "prod-mvp"],
        "milestone": "MVP-1: Production Ready",
    },
    {
        "title": "Replace Socket.IO firehose with Redis Streams + consumer groups",
        "body": """## Description
Implement proper job queue with Redis Streams to handle backpressure and enable event replay.

## Acceptance Criteria
- [ ] All Copilot events stored in Redis Streams
- [ ] Consumer groups for UI subscriptions
- [ ] Cursor-based pagination for event history
- [ ] Backpressure handling (no memory leaks under load)
- [ ] 100k events replay without loss
- [ ] UI scrolls smoothly with large event volumes
- [ ] Dead letter queue for failed processing

## Technical Notes
- Use Redis Streams XADD/XREAD commands
- Implement consumer group per investigation
- Add XACK for message acknowledgment
- Keep Socket.IO for real-time but make it stateless

## Implementation
Update `/server/src/realtime/socket.js` and create `/server/src/queues/eventQueue.js`

## Priority
Medium - Improves reliability but not blocking""",
        "labels": ["phase-4", "reliability", "backend"],
        "milestone": "MVP-1: Production Ready",
    },
    # Phase 5: Advanced Features
    {
        "title": "Implement GNN-based entity resolution and link prediction",
        "body": """## Description
Add Graph Neural Network capabilities for advanced graph analytics.

## Acceptance Criteria
- [ ] Entity resolution using GNN embeddings
- [ ] Link prediction for missing relationships
- [ ] Community detection with graph clustering
- [ ] Node classification and similarity scoring
- [ ] Integration with existing Copilot workflows
- [ ] Performance benchmarks on 10k+ node graphs

## Technical Notes
- Use PyTorch Geometric or DGL
- Train models on investigation graph data
- Expose via GraphQL or REST API
- Consider GPU acceleration for large graphs

## Implementation
Extend `/ml/app/models/gnn.py` and integrate with GraphQL resolvers

## Priority
Low - Advanced feature for future releases""",
        "labels": ["phase-5", "ai-ml", "backend", "epic"],
        "milestone": "MVP-2: Advanced Features",
    },
    {
        "title": "Build connectors for OSINT APIs (Shodan, VirusTotal, etc.)",
        "body": """## Description
Create extensible connector framework for external intelligence sources.

## Acceptance Criteria
- [ ] Shodan API connector for IP/domain enrichment
- [ ] VirusTotal connector for file/URL analysis
- [ ] Rate limiting and API key management
- [ ] Async job processing for bulk lookups
- [ ] Enrichment results stored with provenance
- [ ] Plugin architecture for custom connectors

## Technical Notes
- Use async/await for non-blocking operations
- Implement circuit breaker pattern
- Cache results to minimize API calls
- Support multiple API key rotation

## Implementation
Create `/server/src/connectors/` directory with base classes

## Priority
Medium - Valuable for intelligence analysis""",
        "labels": ["phase-5", "integrations", "backend"],
        "milestone": "MVP-2: Advanced Features",
    },
    {
        "title": "Add temporal analysis and event replay capabilities",
        "body": """## Description
Enable time-based analysis and replay of graph evolution.

## Acceptance Criteria
- [ ] Timeline visualization of graph changes
- [ ] Event replay with time slider control
- [ ] Temporal query support (graph at time T)
- [ ] Animation of relationship formation/deletion
- [ ] Export timeline data for external analysis
- [ ] Performance optimized for large time ranges

## Technical Notes
- Store graph snapshots or event deltas
- Use efficient temporal indexing
- Consider data retention policies
- Implement smooth UI animations

## Implementation
Create `/client/src/components/timeline/` components

## Priority
Medium - Enhances analytical capabilities""",
        "labels": ["phase-5", "features", "frontend"],
        "milestone": "MVP-2: Advanced Features",
    },
    {
        "title": "Enable federated queries across multiple graph databases",
        "body": """## Description
Support querying across multiple Neo4j instances or graph database types.

## Acceptance Criteria
- [ ] Cross-database join operations
- [ ] Query planning and optimization
- [ ] Result aggregation and deduplication
- [ ] Authentication/authorization across instances
- [ ] Performance monitoring for federated queries
- [ ] GraphQL federation support

## Technical Notes
- Implement graph federation protocol
- Use Apollo Federation or custom solution
- Consider query complexity limits
- Handle partial failures gracefully

## Implementation
Create `/server/src/federation/` module with query planner

## Priority
Low - Enterprise feature for large deployments""",
        "labels": ["phase-5", "architecture", "backend", "epic"],
        "milestone": "MVP-3: Enterprise Scale",
    },
]


def create_milestone(milestone_data):
    """Create a milestone on GitHub"""
    url = f"{BASE_URL}/milestones"
    response = requests.post(url, headers=headers, json=milestone_data)
    if response.status_code == 201:
        print(f"✅ Created milestone: {milestone_data['title']}")
        return response.json()["number"]
    elif response.status_code == 422:
        # Milestone already exists, get its number
        milestones_resp = requests.get(url, headers=headers)
        if milestones_resp.status_code == 200:
            for milestone in milestones_resp.json():
                if milestone["title"] == milestone_data["title"]:
                    print(f"✅ Milestone already exists: {milestone_data['title']}")
                    return milestone["number"]
    print(f"❌ Failed to create milestone: {milestone_data['title']}")
    print(f"Response: {response.status_code} - {response.text}")
    return None


def create_label(label_data):
    """Create a label on GitHub"""
    url = f"{BASE_URL}/labels"
    response = requests.post(url, headers=headers, json=label_data)
    if response.status_code == 201:
        print(f"✅ Created label: {label_data['name']}")
        return True
    elif response.status_code == 422:
        print(f"✅ Label already exists: {label_data['name']}")
        return True
    print(f"❌ Failed to create label: {label_data['name']}")
    print(f"Response: {response.status_code} - {response.text}")
    return False


def create_issue(issue_data, milestone_numbers):
    """Create an issue on GitHub"""
    # Convert milestone title to number
    if "milestone" in issue_data:
        milestone_title = issue_data["milestone"]
        issue_data["milestone"] = milestone_numbers.get(milestone_title)
        if not issue_data["milestone"]:
            print(f"❌ Milestone not found: {milestone_title}")
            del issue_data["milestone"]

    url = f"{BASE_URL}/issues"
    response = requests.post(url, headers=headers, json=issue_data)
    if response.status_code == 201:
        issue_number = response.json()["number"]
        print(f"✅ Created issue #{issue_number}: {issue_data['title']}")
        return True
    print(f"❌ Failed to create issue: {issue_data['title']}")
    print(f"Response: {response.status_code} - {response.text}")
    return False


def main():
    if not GITHUB_TOKEN:
        print("❌ Please set GITHUB_TOKEN environment variable")
        print("You can create a token at: https://github.com/settings/tokens")
        print("Required scopes: repo (for private repos) or public_repo (for public repos)")
        return

    print(f"🚀 Creating GitHub issues for {REPO_OWNER}/{REPO_NAME}")
    print()

    # Create milestones
    print("📅 Creating milestones...")
    milestone_numbers = {}
    for milestone in milestones:
        number = create_milestone(milestone)
        if number:
            milestone_numbers[milestone["title"]] = number

    print()

    # Create labels
    print("🏷️  Creating labels...")
    for label in labels:
        create_label(label)

    print()

    # Create issues
    print("📋 Creating issues...")
    created_count = 0
    for issue in issues:
        if create_issue(issue, milestone_numbers):
            created_count += 1

    print()
    print(f"🎉 Successfully created {created_count}/{len(issues)} issues!")
    print()
    print("Next steps:")
    print(f"1. Review the issues at: https://github.com/{REPO_OWNER}/{REPO_NAME}/issues")
    print("2. Assign team members to issues")
    print("3. Set up project board for tracking")
    print("4. Start with 'prod-mvp' labeled issues for production readiness")


if __name__ == "__main__":
    main()

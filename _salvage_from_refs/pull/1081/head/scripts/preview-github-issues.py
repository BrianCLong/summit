#!/usr/bin/env python3

"""
Preview GitHub Issues for IntelGraph MVP Roadmap
This script shows what issues would be created without requiring GitHub token
"""

# Issues to create (same as create-github-issues.py but for preview)
issues = [
    # Phase 4: Observability & Reliability
    {
        "title": "Add OpenTelemetry tracing and Prometheus metrics",
        "labels": ["phase-4", "observability", "backend", "prod-mvp"],
        "milestone": "MVP-1: Production Ready",
        "priority": "High",
        "description": "Wire OpenTelemetry instrumentation throughout the GraphQL API and add Prometheus metrics for monitoring.",
    },
    {
        "title": "Complete smoke tests and CI/CD improvements",
        "labels": ["phase-4", "ci-cd", "testing", "prod-mvp"],
        "milestone": "MVP-1: Production Ready",
        "priority": "High",
        "description": "Implement comprehensive smoke tests and enhance CI/CD pipeline for production readiness.",
    },
    {
        "title": "Add Graph Performance Mode with LOD/clustering",
        "labels": ["phase-4", "frontend", "performance"],
        "milestone": "MVP-1: Production Ready",
        "priority": "Medium",
        "description": "Implement performance optimizations for large graphs with Level-of-Detail rendering and clustering.",
    },
    {
        "title": "Add gitleaks and Trivy security scans to CI pipeline",
        "labels": ["phase-4", "security", "ci-cd", "prod-mvp"],
        "milestone": "MVP-1: Production Ready",
        "priority": "High",
        "description": "Integrate security scanning tools into the CI/CD pipeline to catch vulnerabilities early.",
    },
    {
        "title": "Create comprehensive backup and disaster recovery procedures",
        "labels": ["phase-4", "sre", "documentation", "prod-mvp"],
        "milestone": "MVP-1: Production Ready",
        "priority": "High",
        "description": "Document and test backup/restore procedures for all data stores.",
    },
    {
        "title": "Replace Socket.IO firehose with Redis Streams + consumer groups",
        "labels": ["phase-4", "reliability", "backend"],
        "milestone": "MVP-1: Production Ready",
        "priority": "Medium",
        "description": "Implement proper job queue with Redis Streams to handle backpressure and enable event replay.",
    },
    # Phase 5: Advanced Features
    {
        "title": "Implement GNN-based entity resolution and link prediction",
        "labels": ["phase-5", "ai-ml", "backend", "epic"],
        "milestone": "MVP-2: Advanced Features",
        "priority": "Low",
        "description": "Add Graph Neural Network capabilities for advanced graph analytics.",
    },
    {
        "title": "Build connectors for OSINT APIs (Shodan, VirusTotal, etc.)",
        "labels": ["phase-5", "integrations", "backend"],
        "milestone": "MVP-2: Advanced Features",
        "priority": "Medium",
        "description": "Create extensible connector framework for external intelligence sources.",
    },
    {
        "title": "Add temporal analysis and event replay capabilities",
        "labels": ["phase-5", "features", "frontend"],
        "milestone": "MVP-2: Advanced Features",
        "priority": "Medium",
        "description": "Enable time-based analysis and replay of graph evolution.",
    },
    {
        "title": "Enable federated queries across multiple graph databases",
        "labels": ["phase-5", "architecture", "backend", "epic"],
        "milestone": "MVP-3: Enterprise Scale",
        "priority": "Low",
        "description": "Support querying across multiple Neo4j instances or graph database types.",
    },
]


def main():
    print("🚀 IntelGraph MVP-1 Production Ready Issues Preview")
    print("=" * 60)
    print()

    # Group by milestone
    milestones = {}
    for issue in issues:
        milestone = issue["milestone"]
        if milestone not in milestones:
            milestones[milestone] = []
        milestones[milestone].append(issue)

    for milestone, milestone_issues in milestones.items():
        print(f"📅 {milestone}")
        print("-" * 40)

        # Group by priority
        priorities = {"High": [], "Medium": [], "Low": []}
        for issue in milestone_issues:
            priorities[issue["priority"]].append(issue)

        for priority, priority_issues in priorities.items():
            if priority_issues:
                print(f"\n🔥 {priority} Priority:")
                for issue in priority_issues:
                    labels_str = ", ".join(issue["labels"])
                    print(f"  • {issue['title']}")
                    print(f"    Labels: [{labels_str}]")
                    print(f"    {issue['description']}")
                    print()

        print()

    print("📊 Summary:")
    print(f"  • Total Issues: {len(issues)}")
    print(f"  • High Priority: {len([i for i in issues if i['priority'] == 'High'])}")
    print(f"  • Medium Priority: {len([i for i in issues if i['priority'] == 'Medium'])}")
    print(f"  • Low Priority: {len([i for i in issues if i['priority'] == 'Low'])}")
    print(f"  • Production MVP: {len([i for i in issues if 'prod-mvp' in i['labels']])}")
    print()

    print("🔑 To create these issues on GitHub:")
    print("1. Set GITHUB_TOKEN environment variable")
    print("2. Run: python scripts/create-github-issues.py")
    print()
    print("💡 Most Critical for Production:")
    prod_critical = [i for i in issues if "prod-mvp" in i["labels"] and i["priority"] == "High"]
    for issue in prod_critical:
        print(f"  ✅ {issue['title']}")


if __name__ == "__main__":
    main()

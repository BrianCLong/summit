# Contribution Workflows - Summit/IntelGraph

> **Purpose**: Visual guides for common development workflows
> **Last Updated**: 2025-11-20

This document provides visual workflow diagrams for contributing to the Summit/IntelGraph platform.

## Table of Contents

- [Overall Contribution Workflow](#overall-contribution-workflow)
- [Development Setup Flow](#development-setup-flow)
- [Feature Development Workflow](#feature-development-workflow)
- [Pull Request Review Process](#pull-request-review-process)
- [CI/CD Pipeline](#cicd-pipeline)
- [Git Branching Strategy](#git-branching-strategy)
- [Hotfix Workflow](#hotfix-workflow)
- [Database Migration Workflow](#database-migration-workflow)

---

## Overall Contribution Workflow

```mermaid
graph TD
    A[Start] --> B[Fork/Clone Repository]
    B --> C[Create Feature Branch]
    C --> D[Make Changes]
    D --> E[Write Tests]
    E --> F[Run Local Tests]
    F --> G{Tests Pass?}
    G -->|No| D
    G -->|Yes| H[Commit Changes]
    H --> I[Push to Remote]
    I --> J[Create Pull Request]
    J --> K[CI Checks Run]
    K --> L{CI Green?}
    L -->|No| M[Fix Issues]
    M --> D
    L -->|Yes| N[Request Review]
    N --> O[Code Review]
    O --> P{Approved?}
    P -->|Changes Requested| Q[Address Feedback]
    Q --> D
    P -->|Approved| R[Merge to Main]
    R --> S[Deploy]
    S --> T[Monitor]
    T --> U[End]
    
    style A fill:#90EE90
    style U fill:#90EE90
    style R fill:#FFD700
    style S fill:#FFD700
```

---

## Development Setup Flow

```mermaid
graph LR
    A[Clone Repo] --> B[Check Prerequisites]
    B --> C{Node 18+?}
    C -->|No| D[Install Node]
    D --> E
    C -->|Yes| E[Check pnpm]
    E --> F{pnpm 9+?}
    F -->|No| G[Install pnpm]
    G --> H
    F -->|Yes| H[Check Docker]
    H --> I{Docker Running?}
    I -->|No| J[Start Docker]
    J --> K
    I -->|Yes| K[Run make bootstrap]
    K --> L[pnpm install]
    L --> M[Copy .env]
    M --> N[Setup Husky]
    N --> O[Run make up]
    O --> P[Start Services]
    P --> Q[Wait for Health]
    Q --> R{All Healthy?}
    R -->|No| S[Check Logs]
    S --> T[Troubleshoot]
    T --> O
    R -->|Yes| U[Run make smoke]
    U --> V{Tests Pass?}
    V -->|No| S
    V -->|Yes| W[Ready to Code!]
    
    style W fill:#90EE90
    style T fill:#FFB6C1
```

---

## Feature Development Workflow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Local as Local Env
    participant Git as Git/GitHub
    participant CI as CI/CD
    participant Team as Team
    
    Dev->>Git: Create feature branch
    Dev->>Local: Write code
    Dev->>Local: Write tests
    Dev->>Local: Run pnpm ci
    
    alt Tests Fail
        Local-->>Dev: Failures
        Dev->>Local: Fix issues
    end
    
    Dev->>Git: Commit (pre-commit hooks run)
    
    alt Pre-commit Fails
        Git-->>Dev: Hook failures
        Dev->>Local: Fix issues
    end
    
    Dev->>Git: Push to remote
    Dev->>Git: Create Pull Request
    Git->>CI: Trigger CI checks
    
    par CI Checks
        CI->>CI: Lint
        CI->>CI: Type check
        CI->>CI: Unit tests
        CI->>CI: E2E tests
        CI->>CI: Security scan
        CI->>CI: Build
    end
    
    CI-->>Git: CI Results
    
    alt CI Fails
        Git-->>Dev: CI failures
        Dev->>Local: Fix issues
        Dev->>Git: Push fixes
    end
    
    Dev->>Team: Request review
    Team->>Team: Code review
    
    alt Changes Requested
        Team-->>Dev: Feedback
        Dev->>Local: Address feedback
        Dev->>Git: Push updates
    end
    
    Team->>Git: Approve PR
    Dev->>Git: Merge to main
    Git->>CI: Trigger deployment
    CI->>CI: Deploy to staging
    CI-->>Team: Deployment complete
```

---

## Pull Request Review Process

```mermaid
flowchart TD
    A[PR Created] --> B{CI Green?}
    B -->|No| C[Wait for CI]
    C --> B
    B -->|Yes| D[Assign Reviewers]
    D --> E[Reviewer: Initial Scan]
    E --> F{PR Too Large?}
    F -->|Yes| G[Request Split]
    G --> H[Author Splits PR]
    H --> A
    F -->|No| I[Reviewer: Detailed Review]
    I --> J[Pull Branch Locally]
    J --> K[Run Tests Locally]
    K --> L[Review Code]
    L --> M{Issues Found?}
    M -->|Yes| N[Leave Comments]
    N --> O{Critical Issues?}
    O -->|Yes| P[Request Changes]
    O -->|No| Q[Comment Only]
    M -->|No| R[Approve PR]
    P --> S[Author Addresses Issues]
    S --> T[Push Updates]
    T --> U[Re-review]
    U --> M
    Q --> V{All Reviewers Done?}
    V -->|No| D
    V -->|Yes| W{Approved?}
    W -->|No| P
    W -->|Yes| R
    R --> X[Merge PR]
    X --> Y[Delete Branch]
    Y --> Z[Monitor Production]
    
    style A fill:#E6F3FF
    style R fill:#90EE90
    style P fill:#FFB6C1
    style X fill:#FFD700
```

---

## CI/CD Pipeline

```mermaid
graph TB
    subgraph "Commit/Push"
        A[Developer Pushes Code] --> B[Pre-push Hooks]
        B --> C{Hooks Pass?}
        C -->|No| D[Fix Issues Locally]
        D --> A
        C -->|Yes| E[Code Pushed to GitHub]
    end
    
    subgraph "CI Pipeline"
        E --> F[Trigger GitHub Actions]
        F --> G[Install Dependencies]
        G --> H[Run Linting]
        G --> I[Run Type Check]
        G --> J[Run Unit Tests]
        G --> K[Run Integration Tests]
        G --> L[Run E2E Tests]
        G --> M[Security Scan]
        G --> N[Build All Packages]
        
        H --> O{Lint Pass?}
        I --> P{Types Pass?}
        J --> Q{Tests Pass?}
        K --> R{Integration Pass?}
        L --> S{E2E Pass?}
        M --> T{Secure?}
        N --> U{Build Success?}
        
        O -->|No| V[CI Failed]
        P -->|No| V
        Q -->|No| V
        R -->|No| V
        S -->|No| V
        T -->|No| V
        U -->|No| V
        
        O -->|Yes| W[All Checks Pass]
        P -->|Yes| W
        Q -->|Yes| W
        R -->|Yes| W
        S -->|Yes| W
        T -->|Yes| W
        U -->|Yes| W
    end
    
    subgraph "Post-Merge"
        W --> X{Branch?}
        X -->|Main| Y[Deploy to Staging]
        X -->|Other| Z[End]
        Y --> AA[Run Smoke Tests]
        AA --> AB{Tests Pass?}
        AB -->|No| AC[Rollback]
        AB -->|Yes| AD[Monitor Metrics]
        AD --> AE{Healthy?}
        AE -->|No| AC
        AE -->|Yes| AF[Deploy to Production]
        AF --> AG[Monitor Production]
    end
    
    style V fill:#FFB6C1
    style W fill:#90EE90
    style AF fill:#FFD700
    style AC fill:#FF6B6B
```

---

## Git Branching Strategy

```mermaid
gitGraph
    commit id: "Initial commit"
    commit id: "Setup project"
    
    branch develop
    checkout develop
    commit id: "Add feature scaffold"
    
    branch feature/user-auth
    checkout feature/user-auth
    commit id: "Add auth service"
    commit id: "Add auth tests"
    commit id: "Add auth UI"
    
    checkout develop
    merge feature/user-auth tag: "v1.1.0"
    
    branch feature/graph-viz
    checkout feature/graph-viz
    commit id: "Add graph component"
    commit id: "Add graph tests"
    
    checkout main
    branch hotfix/security-patch
    commit id: "Fix security issue"
    checkout main
    merge hotfix/security-patch tag: "v1.0.1"
    
    checkout develop
    merge hotfix/security-patch
    merge feature/graph-viz tag: "v1.2.0"
    
    checkout main
    merge develop tag: "v1.2.0"
```

### Branch Types

- **`main`**: Production-ready code, always deployable
- **`develop`**: Integration branch for features (if using Gitflow)
- **`feature/*`**: New features or enhancements
- **`fix/*`**: Bug fixes
- **`hotfix/*`**: Urgent production fixes
- **`release/*`**: Release preparation
- **`claude/*`**: AI assistant branches

---

## Hotfix Workflow

```mermaid
flowchart LR
    A[Production Issue Detected] --> B[Create Hotfix Branch from Main]
    B --> C[Fix Issue]
    C --> D[Write Test]
    D --> E[Run Tests Locally]
    E --> F{Tests Pass?}
    F -->|No| C
    F -->|Yes| G[Create PR]
    G --> H[Expedited Review]
    H --> I[CI Checks]
    I --> J{CI Green?}
    J -->|No| C
    J -->|Yes| K[Approve PR]
    K --> L[Merge to Main]
    L --> M[Deploy to Staging]
    M --> N[Smoke Tests]
    N --> O{Tests Pass?}
    O -->|No| P[Rollback]
    P --> C
    O -->|Yes| Q[Deploy to Production]
    Q --> R[Monitor Closely]
    R --> S{Issue Resolved?}
    S -->|No| T[Additional Fix]
    T --> C
    S -->|Yes| U[Merge to Develop]
    U --> V[Update Changelog]
    V --> W[Post-Mortem]
    W --> X[End]
    
    style A fill:#FF6B6B
    style Q fill:#FFD700
    style W fill:#E6E6FA
    style X fill:#90EE90
```

---

## Database Migration Workflow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Local as Local DB
    participant Git as Git/GitHub
    participant CI as CI/CD
    participant Stage as Staging DB
    participant Prod as Production DB
    
    Dev->>Dev: Write migration script
    Dev->>Local: Test migration up
    Dev->>Local: Test migration down (rollback)
    Dev->>Local: Verify data integrity
    
    alt Migration Fails
        Local-->>Dev: Error
        Dev->>Dev: Fix migration
    end
    
    Dev->>Git: Commit migration
    Dev->>Git: Create PR
    Git->>CI: Trigger CI
    CI->>CI: Run migration tests
    
    alt Tests Fail
        CI-->>Dev: Failure
        Dev->>Dev: Fix issues
    end
    
    CI-->>Git: Tests pass
    Dev->>Git: Merge PR
    
    Git->>CI: Deploy to staging
    CI->>Stage: Backup database
    CI->>Stage: Run migrations
    
    alt Migration Fails
        Stage-->>CI: Error
        CI->>Stage: Restore backup
        CI-->>Dev: Alert
    end
    
    Stage-->>CI: Success
    CI->>CI: Run smoke tests
    CI-->>Dev: Staging ready
    
    Dev->>Dev: Manual QA on staging
    Dev->>CI: Approve production deploy
    
    CI->>Prod: Backup database
    CI->>Prod: Run migrations
    
    alt Migration Fails
        Prod-->>CI: Error
        CI->>Prod: Restore backup
        CI-->>Dev: Alert - Rollback
    end
    
    Prod-->>CI: Success
    CI->>CI: Run health checks
    CI-->>Dev: Production deployed
```

---

## Release Workflow

```mermaid
graph TD
    A[Feature Development Complete] --> B[Create Release Branch]
    B --> C[Update Version Numbers]
    C --> D[Update CHANGELOG]
    D --> E[Run Full Test Suite]
    E --> F{Tests Pass?}
    F -->|No| G[Fix Issues]
    G --> E
    F -->|Yes| H[Create Release PR]
    H --> I[Team Review]
    I --> J{Approved?}
    J -->|No| K[Address Feedback]
    K --> E
    J -->|Yes| L[Merge to Main]
    L --> M[Tag Release]
    M --> N[Deploy to Staging]
    N --> O[Run Acceptance Tests]
    O --> P{Tests Pass?}
    P -->|No| Q[Fix & Redeploy]
    Q --> N
    P -->|Yes| R[Deploy to Production]
    R --> S[Monitor Metrics]
    S --> T{Healthy?}
    T -->|No| U[Rollback]
    U --> V[Post-Mortem]
    T -->|Yes| W[Announce Release]
    W --> X[Merge Back to Develop]
    X --> Y[End]
    
    style M fill:#FFD700
    style R fill:#FF6347
    style W fill:#90EE90
    style U fill:#FFB6C1
```

---

## Testing Pyramid

```mermaid
graph TB
    subgraph "Testing Strategy"
        A[E2E Tests<br/>Slow, High Value<br/>~10% of tests]
        B[Integration Tests<br/>Medium Speed<br/>~30% of tests]
        C[Unit Tests<br/>Fast, High Volume<br/>~60% of tests]
        
        A --> B
        B --> C
    end
    
    subgraph "Test Execution"
        D[Pre-commit: Unit Tests]
        E[Pre-push: Quick Tests]
        F[CI: Full Suite]
        G[Pre-deploy: E2E]
        H[Post-deploy: Smoke]
        
        D --> E
        E --> F
        F --> G
        G --> H
    end
    
    style A fill:#FFE6E6
    style B fill:#FFF4E6
    style C fill:#E6FFE6
```

---

## Golden Path Verification

```mermaid
flowchart LR
    A[Fresh Clone] --> B[make bootstrap]
    B --> C{Success?}
    C -->|No| D[Check Prerequisites]
    D --> E[Fix Issues]
    E --> B
    C -->|Yes| F[make up]
    F --> G{Services Start?}
    G -->|No| H[Check Docker]
    H --> I[View Logs]
    I --> J[Fix Services]
    J --> F
    G -->|Yes| K[Wait for Health]
    K --> L{All Healthy?}
    L -->|No| M[Check Health Endpoints]
    M --> I
    L -->|Yes| N[make smoke]
    N --> O{Tests Pass?}
    O -->|No| P[Review Test Logs]
    P --> Q[Fix Issues]
    Q --> N
    O -->|Yes| R[Golden Path Valid!]
    
    style R fill:#90EE90
    style D fill:#FFE6E6
    style H fill:#FFE6E6
    style M fill:#FFE6E6
    style P fill:#FFE6E6
```

---

## Quick Reference

### Common Commands

```bash
# Setup
make bootstrap          # Initial setup
make up                # Start services
make smoke             # Golden path test

# Development
pnpm dev               # Start dev servers
pnpm test              # Run tests
pnpm lint              # Lint code
pnpm typecheck         # Type check

# Git
git checkout -b feature/my-feature
git add .
git commit -m "feat: add my feature"
git push -u origin feature/my-feature

# CI/CD
pnpm ci                # Run full CI suite locally
```

### Decision Tree: When to Create a PR?

```mermaid
graph TD
    A[Ready to Share Code?] --> B{Tests Written?}
    B -->|No| C[Write Tests First]
    C --> B
    B -->|Yes| D{Tests Passing?}
    D -->|No| E[Fix Tests]
    E --> D
    D -->|Yes| F{Lint Passing?}
    F -->|No| G[Run pnpm lint]
    G --> F
    F -->|Yes| H{Type Check Passing?}
    H -->|No| I[Run pnpm typecheck]
    I --> H
    H -->|Yes| J{Golden Path Valid?}
    J -->|No| K[Run make smoke]
    K --> L[Fix Issues]
    L --> J
    J -->|Yes| M[Create PR!]
    M --> N{Draft or Ready?}
    N -->|Draft| O[Mark as Draft PR]
    N -->|Ready| P[Request Review]
    
    style M fill:#90EE90
    style C fill:#FFE6E6
    style E fill:#FFE6E6
    style G fill:#FFF4E6
    style I fill:#FFF4E6
    style L fill:#FFE6E6
```

---

## Summary

These workflows ensure:
1. ✅ **Quality**: Multiple checkpoints before production
2. ✅ **Consistency**: Standard processes for all changes
3. ✅ **Visibility**: Clear progress tracking
4. ✅ **Safety**: Rollback procedures at each stage
5. ✅ **Efficiency**: Automated where possible

For more details, see:
- [CLAUDE.md](../CLAUDE.md) - Complete development guide
- [CODE_REVIEW_GUIDELINES.md](./CODE_REVIEW_GUIDELINES.md) - Review standards
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guide
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues

---

**Questions?** Check our documentation or reach out in #engineering!

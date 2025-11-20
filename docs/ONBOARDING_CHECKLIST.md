# Developer Onboarding Checklist

Use this checklist to track your onboarding progress. Check off items as you complete them.

## Day 1: Setup & Environment

### Prerequisites
- [ ] Install Node.js 18+ ([nodejs.org](https://nodejs.org/))
- [ ] Install Docker Desktop ([docker.com](https://www.docker.com/))
- [ ] Install Git ([git-scm.com](https://git-scm.com/))
- [ ] Enable corepack: `corepack enable`
- [ ] Install pnpm: `corepack prepare pnpm@9.12.3 --activate`

### Environment Setup
- [ ] Clone repository: `git clone https://github.com/BrianCLong/summit.git`
- [ ] Navigate to project: `cd summit`
- [ ] Run environment check: `./scripts/dev-check.sh`
- [ ] Bootstrap environment: `make bootstrap`
- [ ] Start services: `make up`
- [ ] Wait for services to be healthy (2-3 minutes)
- [ ] Run smoke tests: `make smoke`

### VS Code Setup (Recommended)
- [ ] Install VS Code ([code.visualstudio.com](https://code.visualstudio.com/))
- [ ] Open project in VS Code
- [ ] Install recommended extensions (VS Code will prompt)
- [ ] Verify TypeScript version is set to "Use Workspace Version"
- [ ] Test format on save works

### Access Services
- [ ] Frontend: [http://localhost:3000](http://localhost:3000)
- [ ] GraphQL Playground: [http://localhost:4000/graphql](http://localhost:4000/graphql)
- [ ] Neo4j Browser: [http://localhost:7474](http://localhost:7474) (neo4j/devpassword)
- [ ] Adminer (DB Admin): [http://localhost:8080](http://localhost:8080)

### Documentation Review
- [ ] Read [DEVELOPER_ONBOARDING.md](DEVELOPER_ONBOARDING.md)
- [ ] Skim [CLAUDE.md](../CLAUDE.md) (reference guide)
- [ ] Bookmark [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- [ ] Review [ARCHITECTURE.md](ARCHITECTURE.md)

## Day 2-3: Learning & Exploration

### Project Structure
- [ ] Explore `apps/` directory (application entry points)
- [ ] Explore `packages/` directory (shared libraries)
- [ ] Explore `services/` directory (microservices)
- [ ] Review `docs/` directory
- [ ] Understand monorepo structure (pnpm workspaces + Turbo)

### Development Workflow
- [ ] Create a feature branch: `git checkout -b test/my-first-branch`
- [ ] Make a small change (e.g., update a comment)
- [ ] Run linting: `pnpm lint`
- [ ] Run type checking: `pnpm typecheck`
- [ ] Run tests: `pnpm test`
- [ ] Commit with conventional commit: `git commit -m "docs: test commit"`
- [ ] Push branch: `git push -u origin test/my-first-branch`
- [ ] Delete test branch: `git branch -d test/my-first-branch`

### Testing
- [ ] Run unit tests: `pnpm test`
- [ ] Run specific test: `pnpm test -- path/to/test.test.ts`
- [ ] Run E2E tests: `pnpm e2e`
- [ ] Run smoke tests: `make smoke`
- [ ] Debug a test in VS Code (set breakpoint, press F5)

### GraphQL API
- [ ] Open GraphQL Playground
- [ ] Explore schema in "Docs" tab
- [ ] Run a simple query (e.g., health check)
- [ ] Try a mutation (if safe test data available)
- [ ] Review `packages/graphql/schema.graphql`

### Database
- [ ] Access Neo4j Browser
- [ ] Run a simple Cypher query: `MATCH (n) RETURN count(n)`
- [ ] Access PostgreSQL via Adminer
- [ ] Review database schema
- [ ] Understand migration workflow

## Week 1: First Contributions

### Code Quality
- [ ] Review [CODE_REVIEW_GUIDELINES.md](CODE_REVIEW_GUIDELINES.md)
- [ ] Understand conventional commits format
- [ ] Review PR template: [PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md)
- [ ] Understand pre-commit hooks

### First Task (Small Bug Fix or Docs Update)
- [ ] Find a good first issue (labeled `good-first-issue`)
- [ ] Assign issue to yourself
- [ ] Create feature branch: `git checkout -b fix/issue-number-description`
- [ ] Make changes
- [ ] Write/update tests
- [ ] Run full CI locally: `pnpm ci`
- [ ] Commit changes with descriptive message
- [ ] Push branch
- [ ] Create Pull Request using template
- [ ] Address review feedback
- [ ] Merge PR (or have it merged)
- [ ] Delete branch after merge

### Code Review
- [ ] Review someone else's PR
- [ ] Leave constructive feedback
- [ ] Ask questions if something is unclear
- [ ] Approve a PR (if appropriate)

### Team Integration
- [ ] Join team chat/Slack (#engineering)
- [ ] Introduce yourself to the team
- [ ] Attend team standup/meeting
- [ ] Ask questions when stuck
- [ ] Share learnings with team

## Week 2: Deeper Dive

### Advanced Topics
- [ ] Understand CI/CD pipeline (`.github/workflows/`)
- [ ] Review security practices (secret scanning, OPA policies)
- [ ] Learn about observability (Prometheus, Grafana)
- [ ] Explore GraphQL federation (if applicable)
- [ ] Understand multi-database architecture

### Development Patterns
- [ ] Review TypeScript patterns in codebase
- [ ] Understand GraphQL resolver patterns
- [ ] Learn Neo4j Cypher query patterns
- [ ] Study error handling patterns
- [ ] Review testing patterns and factories

### Troubleshooting
- [ ] Intentionally break something and fix it
- [ ] Practice using [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [ ] Debug a service using Docker logs
- [ ] Fix a test failure
- [ ] Resolve a merge conflict

### Contribution Workflows
- [ ] Review [CONTRIBUTION_WORKFLOWS.md](CONTRIBUTION_WORKFLOWS.md)
- [ ] Understand branching strategy
- [ ] Learn hotfix workflow
- [ ] Understand database migration process

## Ongoing: Best Practices

### Daily Habits
- [ ] Pull latest changes: `git pull origin main`
- [ ] Run smoke tests before starting work
- [ ] Keep feature branches small and focused
- [ ] Write tests for new code
- [ ] Run `pnpm ci` before creating PR
- [ ] Respond to PR feedback promptly

### Weekly Review
- [ ] Review open PRs and provide feedback
- [ ] Check for outdated dependencies
- [ ] Review team's recent commits for learning
- [ ] Update documentation if gaps found
- [ ] Share knowledge with team

### Continuous Learning
- [ ] Read ADRs (Architecture Decision Records) in `docs/ADR/`
- [ ] Explore new features in codebase
- [ ] Learn from code reviews
- [ ] Experiment with new patterns
- [ ] Contribute to documentation

## Need Help?

### Resources
- 📖 Documentation: `docs/` directory
- ⚡ Quick help: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- 🔧 Issues: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### Support Channels
1. Check documentation first
2. Search existing GitHub issues
3. Ask in team chat (#engineering)
4. Create new GitHub issue with details
5. Schedule pairing session with team member

## Completion

Once you've checked off most items above, you should feel confident:
- ✅ Setting up the development environment
- ✅ Making code changes
- ✅ Writing and running tests
- ✅ Creating pull requests
- ✅ Participating in code reviews
- ✅ Troubleshooting common issues
- ✅ Contributing effectively to the project

**Congratulations! You're now a productive member of the Summit/IntelGraph team! 🎉**

---

**Feedback**: If you found any part of this checklist confusing or incomplete, please update it or let the team know!

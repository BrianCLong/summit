# Claude Code Guide for Summit/IntelGraph

> **Last Updated**: 2025-11-23
> **Purpose**: Comprehensive guide for using Claude Code CLI effectively with the Summit/IntelGraph repository

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Core Workflows](#core-workflows)
4. [Best Practices](#best-practices)
5. [Advanced Features](#advanced-features)
6. [Integration with Development Tools](#integration-with-development-tools)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)
9. [Tips & Tricks](#tips--tricks)

---

## Introduction

### What is Claude Code?

**Claude Code** is Anthropic's official CLI tool that brings Claude's AI capabilities directly into your development workflow. It's designed to help developers:

- Navigate and understand complex codebases
- Implement features with context-aware assistance
- Debug issues with intelligent analysis
- Refactor code while maintaining consistency
- Write tests and documentation
- Review and improve code quality

### Why Use Claude Code with Summit?

The Summit/IntelGraph platform is a large, complex monorepo with:
- **150+ services** and microservices
- **Multiple technology stacks** (TypeScript, Python, GraphQL, Neo4j, PostgreSQL)
- **Extensive testing requirements** (unit, integration, E2E, smoke tests)
- **Strict security and compliance standards**
- **Production-ready deployability requirements**

Claude Code excels at helping you navigate this complexity while maintaining the "golden path" philosophy.

---

## Getting Started

### Installation

```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Or use npx for one-off commands
npx @anthropic-ai/claude-code
```

### Initial Setup

1. **Configure API Key**:
   ```bash
   export ANTHROPIC_API_KEY="your-api-key-here"
   # Add to ~/.bashrc or ~/.zshrc for persistence
   ```

2. **Navigate to Summit Repository**:
   ```bash
   cd /path/to/summit
   ```

3. **Initialize Claude Code** (if required):
   ```bash
   claude-code init
   ```

### First Session

Start an interactive session:

```bash
claude-code
```

Try your first command:
```
> Help me understand the codebase structure
```

Claude Code will read the CLAUDE.md file and provide context-aware guidance.

---

## Core Workflows

### 1. Understanding the Codebase

#### Exploring Architecture

```bash
# Start Claude Code
claude-code

# Ask architectural questions
> Show me the GraphQL schema structure
> Where is the authentication logic implemented?
> Explain how the golden path smoke test works
> What databases does this project use and how are they connected?
```

#### Finding Specific Code

```bash
> Find all files that implement entity resolution
> Show me where Neo4j queries are executed
> Locate the JWT token validation logic
> Find tests for the Copilot service
```

#### Understanding Dependencies

```bash
> What packages are used for graph visualization?
> Show me the pnpm workspace configuration
> What version of TypeScript is this project using?
> Explain the turbo.json build pipeline
```

### 2. Implementing Features

#### Following CLAUDE.md Conventions

Always reference the project conventions:

```bash
> Following CLAUDE.md conventions, help me add a new GraphQL resolver for entity search
> Add a new React component for displaying investigation timeline, following the project's code style
> Create a new database migration for the audit log table, using the project's migration patterns
```

#### Step-by-Step Implementation

```bash
> I need to add a new feature for exporting investigations to PDF.
> Let's break this down:
> 1. First, show me similar export functionality
> 2. Then help me implement the GraphQL mutation
> 3. Add the backend service logic
> 4. Create the React UI component
> 5. Add tests for each layer
```

### 3. Debugging and Troubleshooting

#### Analyzing Errors

```bash
> The smoke test is failing with "Neo4j connection timeout". Help me debug this.
> I'm getting TypeScript errors in packages/graphql/schema.ts. Can you analyze and fix them?
> The Docker compose stack won't start. Here's the error: [paste error]
```

#### Code Review and Analysis

```bash
> Review this PR and check for security issues
> Analyze the performance of this Neo4j query
> Check if this code follows the project's conventions
> Find potential race conditions in this async code
```

### 4. Testing

#### Writing Tests

```bash
> Write unit tests for the EntityService class
> Add integration tests for the investigation creation flow
> Create E2E tests for the golden path workflow
> Generate test fixtures for the entity resolution logic
```

#### Running and Fixing Tests

```bash
> The Jest tests in server/src/__tests__/entity.test.ts are failing. Help me fix them.
> Run the smoke test and explain any failures
> Help me increase test coverage for the authentication module
```

### 5. Documentation

#### Updating Documentation

```bash
> Update the API documentation for the new entity search endpoint
> Add JSDoc comments to the EntityService class
> Create a README for the new copilot-v2 service
> Document the new environment variables in .env.example
```

---

## Best Practices

### 1. Always Check CLAUDE.md First

Before starting any work, ask Claude Code to reference the project conventions:

```bash
> Following CLAUDE.md, what's the correct way to add a new package to this monorepo?
> According to CLAUDE.md, what testing strategy should I use?
> What are the commit message conventions for this project?
```

### 2. Validate the Golden Path

After making changes, always validate:

```bash
> I've made changes to the authentication logic. What commands should I run to validate the golden path?
> Help me run the smoke test and interpret the results
> Check if my changes break any existing functionality
```

### 3. Security First

Always consider security implications:

```bash
> Review this code for security vulnerabilities
> Check if I'm properly validating user input
> Ensure this database query is protected against SQL injection
> Verify that secrets aren't being committed
```

### 4. Incremental Changes

Work in small, testable increments:

```bash
> Let's implement this feature in small steps:
> Step 1: Add the database schema
> Step 2: Create the service layer
> Step 3: Add the GraphQL resolver
> Step 4: Write tests
> Step 5: Update documentation
```

### 5. Context Management

Help Claude Code maintain context:

```bash
# Good: Provide context
> I'm working on the entity resolution feature. The relevant files are:
> - server/src/services/EntityResolutionService.ts
> - server/src/graphql/resolvers/entity.ts
> I need to add fuzzy matching support.

# Bad: Vague request
> Add fuzzy matching
```

---

## Advanced Features

### 1. Multi-File Refactoring

```bash
> Refactor the authentication logic to use a consistent pattern across all services:
> 1. Identify all files using JWT authentication
> 2. Extract common logic to a shared utility
> 3. Update all services to use the new utility
> 4. Ensure tests still pass
```

### 2. Codebase Analysis

```bash
> Analyze the codebase and identify:
> - Unused dependencies
> - Duplicate code that could be extracted
> - Files that violate the project's TypeScript conventions
> - Security vulnerabilities in dependency versions
```

### 3. Migration Assistance

```bash
> Help me migrate from ESLint 8 to ESLint 9 flat config:
> 1. Show me the current configuration
> 2. Explain the differences
> 3. Generate the new flat config
> 4. Update all affected files
> 5. Run linting to verify
```

### 4. Performance Optimization

```bash
> Analyze the performance of the graph rendering:
> 1. Identify bottlenecks in the code
> 2. Suggest optimization strategies
> 3. Implement LOD (Level of Detail) rendering
> 4. Add performance benchmarks
```

### 5. Integration Testing

```bash
> Create an integration test that validates the full investigation workflow:
> 1. Create an investigation
> 2. Add entities and relationships
> 3. Run Copilot analysis
> 4. Export results
> 5. Clean up test data
```

---

## Integration with Development Tools

### With Git

```bash
# Review changes before committing
> Review my git diff and suggest improvements

# Generate commit messages
> Generate a conventional commit message for my changes

# Create PR descriptions
> Create a PR description for the changes I've made, following the project's template
```

### With Docker

```bash
# Debug Docker issues
> Docker compose won't start. Here's the error: [paste]

# Optimize Dockerfiles
> Review the Dockerfile and suggest optimizations for build time and image size

# Health check configuration
> Help me add health checks to the docker-compose.dev.yml
```

### With pnpm/Turbo

```bash
# Workspace management
> Show me how to add a new package to the pnpm workspace

# Build optimization
> Analyze the turbo.json and suggest caching improvements

# Dependency management
> Check for outdated dependencies and suggest safe updates
```

### With Testing Frameworks

```bash
# Jest configuration
> Help me configure Jest to run tests in parallel

# Playwright E2E
> Create Playwright tests for the investigation creation flow

# Coverage analysis
> Analyze test coverage and suggest areas that need more tests
```

---

## Common Patterns

### Pattern 1: Feature Implementation Checklist

```bash
> I need to implement [feature]. Help me create a checklist following the golden path:
> - [ ] Design database schema (if needed)
> - [ ] Create/update GraphQL schema
> - [ ] Implement resolvers
> - [ ] Add service layer logic
> - [ ] Create React components
> - [ ] Write unit tests
> - [ ] Write integration tests
> - [ ] Update documentation
> - [ ] Run smoke test
> - [ ] Create PR
```

### Pattern 2: Bug Investigation

```bash
> I have a bug: [description]
> 1. Help me reproduce it
> 2. Identify the root cause
> 3. Suggest a fix
> 4. Write a test to prevent regression
> 5. Verify the fix doesn't break anything
```

### Pattern 3: Code Quality Improvement

```bash
> Improve the code quality of [file/module]:
> 1. Apply TypeScript strict mode
> 2. Add proper error handling
> 3. Extract magic numbers to constants
> 4. Add comprehensive JSDoc comments
> 5. Improve variable naming
> 6. Ensure consistent code style
```

### Pattern 4: Security Audit

```bash
> Audit [feature/file] for security issues:
> 1. Check for input validation
> 2. Verify authentication/authorization
> 3. Look for SQL injection vulnerabilities
> 4. Check for XSS vulnerabilities
> 5. Verify secrets are not exposed
> 6. Check dependencies for known vulnerabilities
```

### Pattern 5: Performance Optimization

```bash
> Optimize performance of [feature]:
> 1. Profile current performance
> 2. Identify bottlenecks
> 3. Suggest optimization strategies
> 4. Implement optimizations
> 5. Add performance benchmarks
> 6. Verify improvements
```

---

## Troubleshooting

### Common Issues

#### Issue: Claude Code doesn't understand the codebase

**Solution**: Explicitly reference CLAUDE.md
```bash
> Read CLAUDE.md and then help me understand the codebase structure
```

#### Issue: Responses are too generic

**Solution**: Provide more context
```bash
# Instead of:
> How do I add a new service?

# Try:
> Following CLAUDE.md conventions, how do I add a new microservice to the services/ directory with proper package.json, TypeScript setup, and Docker integration?
```

#### Issue: Claude Code suggests breaking changes

**Solution**: Emphasize backward compatibility
```bash
> Add this feature while maintaining backward compatibility and not breaking the golden path smoke test
```

#### Issue: Changes don't follow project conventions

**Solution**: Always reference conventions
```bash
> Following the TypeScript, ESLint, and Prettier configurations in this project, refactor this code
```

### Getting Unstuck

If you're stuck, try these approaches:

1. **Start with exploration**:
   ```bash
   > Show me 3 examples of similar functionality in this codebase
   ```

2. **Break down the problem**:
   ```bash
   > Let's break this into smaller tasks. What's the first step?
   ```

3. **Ask for alternatives**:
   ```bash
   > What are 3 different approaches to implementing this feature?
   ```

4. **Reference documentation**:
   ```bash
   > Based on docs/ARCHITECTURE.md, what's the recommended approach?
   ```

---

## Tips & Tricks

### 1. Use Descriptive Prompts

```bash
# Good
> Following CLAUDE.md conventions, add a GraphQL mutation for creating investigations with proper authentication, input validation, and audit logging

# Bad
> Add investigation mutation
```

### 2. Leverage Context Files

Claude Code automatically reads contextual files like CLAUDE.md, README.md, and package.json. Reference them:

```bash
> According to the README, what's the golden path workflow?
> Based on package.json, what version of React are we using?
> Following the conventions in CLAUDE.md, format this code
```

### 3. Iterate with Feedback

```bash
> Add a new entity service
[review output]
> Good start, but please add TypeScript types and error handling
[review output]
> Now add unit tests following the patterns in __tests__/
```

### 4. Combine Multiple Tasks

```bash
> Do the following:
> 1. Create a new GraphQL resolver for entity search
> 2. Add the corresponding TypeScript types
> 3. Write unit tests
> 4. Update the schema documentation
> 5. Add a smoke test scenario
```

### 5. Use Project-Specific Vocabulary

The more you use project-specific terms, the better Claude Code understands:

```bash
# Use project terminology
> Update the golden path smoke test
> Add this to the pnpm workspace
> Follow the Turbo build pipeline
> Use the project's TypeScript strict:false configuration
```

### 6. Request Explanations

```bash
> Explain why the smoke test failed and what each error means
> Walk me through the authentication flow step by step
> Describe how the graph visualization LOD system works
```

### 7. Validate Continuously

```bash
> After each change, remind me what commands to run to validate:
> - Linting
> - Type checking
> - Unit tests
> - Smoke test
```

### 8. Maintain Test Coverage

```bash
> For every new function, generate a corresponding test
> Check if my changes decreased test coverage
> Identify untested code paths in this module
```

### 9. Document as You Go

```bash
> Add JSDoc comments to all new functions
> Update the README with this new feature
> Create a migration guide for this breaking change
```

### 10. Think Security First

```bash
> Before implementing, check if this introduces any security risks
> Validate that all user inputs are properly sanitized
> Ensure this follows the OWASP Top 10 guidelines
```

---

## Quick Reference

### Essential Commands

```bash
# Start Claude Code
claude-code

# Get help
> help

# Understand codebase
> Following CLAUDE.md, explain the codebase structure

# Implement feature
> Following project conventions, implement [feature]

# Debug issue
> Debug this error: [error message]

# Write tests
> Write tests for [component/function]

# Run validations
> What commands should I run to validate my changes?

# Commit changes
> Generate a conventional commit message for my changes
```

### Golden Path Workflow with Claude Code

```bash
# 1. Understand the task
> Explain what I need to do to implement [feature]

# 2. Plan the implementation
> Create a step-by-step plan following CLAUDE.md conventions

# 3. Implement each step
> Implement step 1: [description]
[continue for each step]

# 4. Write tests
> Write comprehensive tests for this feature

# 5. Validate
> Run: make smoke
> What should I check to ensure the golden path still works?

# 6. Document
> Update relevant documentation for this feature

# 7. Commit
> Generate a conventional commit message
```

---

## Advanced Scenarios

### Scenario 1: Adding a New Microservice

```bash
> I need to add a new microservice for document processing. Guide me through:
> 1. Creating the service structure in services/
> 2. Setting up package.json with workspace dependencies
> 3. Configuring TypeScript
> 4. Adding Docker support
> 5. Integrating with the API gateway
> 6. Writing tests
> 7. Adding to CI/CD pipeline
> 8. Updating documentation
```

### Scenario 2: Database Schema Migration

```bash
> Help me add a new table for investigation snapshots:
> 1. Design the schema following project patterns
> 2. Create the Prisma/Knex migration
> 3. Update the TypeScript types
> 4. Add repository methods
> 5. Update GraphQL schema
> 6. Write migration tests
> 7. Document the changes
```

### Scenario 3: Security Enhancement

```bash
> Implement rate limiting for the GraphQL API:
> 1. Choose the right approach (Redis-based?)
> 2. Implement the middleware
> 3. Configure per-endpoint limits
> 4. Add bypass for admin users
> 5. Write tests
> 6. Update documentation
> 7. Add monitoring metrics
```

### Scenario 4: Performance Optimization

```bash
> The graph rendering is slow with 1000+ nodes:
> 1. Profile the current performance
> 2. Implement viewport-based rendering
> 3. Add node clustering for dense areas
> 4. Implement progressive loading
> 5. Add performance benchmarks
> 6. Document the optimizations
```

### Scenario 5: Legacy Code Refactoring

```bash
> Refactor the legacy authentication code:
> 1. Understand the current implementation
> 2. Identify code smells and issues
> 3. Design the new architecture
> 4. Implement incremental refactoring
> 5. Ensure backward compatibility
> 6. Update all consumers
> 7. Add comprehensive tests
> 8. Remove old code once validated
```

---

## Integration Examples

### Example 1: Full Feature Implementation

**Goal**: Add semantic search to investigations

```bash
# Step 1: Research
> Show me examples of semantic search in this codebase
> What embedding models are currently used?

# Step 2: Plan
> Create a detailed plan for adding semantic search to investigations:
> - Database changes needed
> - GraphQL schema updates
> - Backend implementation
> - Frontend UI
> - Testing strategy

# Step 3: Implement Database
> Following CLAUDE.md, add vector embeddings support to the investigation table

# Step 4: Implement Backend
> Create a service for generating and searching embeddings
> Add GraphQL mutation and query for semantic search

# Step 5: Implement Frontend
> Add a semantic search component to the investigation view

# Step 6: Test
> Write unit tests for the embedding service
> Write integration tests for the GraphQL endpoints
> Add E2E tests for the search UI

# Step 7: Validate
> Run make smoke and verify the golden path still works
> Check that all new tests pass

# Step 8: Document
> Update the API documentation
> Add usage examples to the README
```

### Example 2: Bug Fix Workflow

**Problem**: Entity deduplication is creating duplicates

```bash
# Step 1: Reproduce
> Help me write a test that reproduces the entity deduplication bug

# Step 2: Investigate
> Analyze the EntityResolutionService and identify the bug

# Step 3: Fix
> Implement a fix for the deduplication logic

# Step 4: Test
> Write regression tests to prevent this bug in the future

# Step 5: Validate
> Run the full test suite
> Run make smoke to ensure golden path works

# Step 6: Document
> Add a comment explaining the fix
> Update CHANGELOG.md
```

---

## Customization

### Creating Custom Prompts

Save frequently used prompts:

```bash
# Create a .claude-prompts file
cat > .claude-prompts << 'EOF'
[add-feature]
Following CLAUDE.md conventions, help me implement a new feature:
1. Explain the architecture impact
2. Create a step-by-step implementation plan
3. List all files that need changes
4. Provide testing strategy
5. Document validation steps

[review-pr]
Review this PR for:
- Code quality and conventions
- Security vulnerabilities
- Performance issues
- Test coverage
- Documentation completeness

[debug-smoke]
The smoke test failed. Help me:
1. Analyze the error
2. Identify root cause
3. Suggest a fix
4. Verify the fix works
EOF
```

Use custom prompts:
```bash
> [add-feature]
> Feature: Add investigation collaboration
```

---

## Resources

### Key Documentation Files

- **CLAUDE.md**: Codebase conventions and structure
- **README.md**: Project overview and quick start
- **docs/ONBOARDING.md**: Developer onboarding guide
- **docs/ARCHITECTURE.md**: System architecture
- **docs/TESTPLAN.md**: Testing strategy

### Useful Commands to Know

```bash
# Development
make bootstrap    # Setup environment
make up          # Start services
make smoke       # Run golden path test
make down        # Stop services

# Testing
pnpm test        # Run all tests
pnpm lint        # Lint code
pnpm typecheck   # Type checking

# Database
pnpm db:pg:migrate     # PostgreSQL migrations
pnpm db:neo4j:migrate  # Neo4j migrations

# Cleanup
make clean       # Clean Docker volumes
```

---

## Best Practices Summary

### ✅ DO

- Reference CLAUDE.md for project conventions
- Validate with smoke tests after changes
- Write tests for new functionality
- Ask for explanations when unclear
- Provide context in your prompts
- Follow the golden path philosophy
- Commit with conventional commit messages
- Document as you code
- Think security first
- Request code reviews

### ❌ DON'T

- Skip the smoke test
- Commit without testing
- Make breaking changes without discussion
- Bypass security guardrails
- Use generic prompts without context
- Implement features without tests
- Ignore TypeScript errors
- Commit secrets or credentials
- Skip documentation updates
- Make large changes without a plan

---

## Getting Help

### Within Claude Code

```bash
> How do I use Claude Code effectively?
> What are the best practices for this project?
> Show me examples of [pattern] in this codebase
```

### External Resources

- **Claude Code Documentation**: https://docs.anthropic.com/claude-code
- **Summit Repository**: https://github.com/BrianCLong/summit
- **Issue Tracker**: https://github.com/BrianCLong/summit/issues

---

## Conclusion

Claude Code is a powerful tool for working with the Summit/IntelGraph platform. By following these guidelines and leveraging the project's documentation, you can:

- Navigate the complex monorepo efficiently
- Implement features that maintain the golden path
- Debug issues quickly with intelligent analysis
- Maintain code quality and security standards
- Collaborate effectively with the team

Remember: **The golden path is sacred. Keep it green!** 🟢

---

**Pro Tip**: Start every session by asking Claude Code to read CLAUDE.md. This ensures all suggestions follow project conventions.

```bash
> Read CLAUDE.md and help me implement this feature following all project conventions
```

Happy coding! 🚀

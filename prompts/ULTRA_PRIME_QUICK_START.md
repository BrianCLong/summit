# Ultra-Prime Agent Quick Start Guide

This guide will help you get started with the Ultra-Prime Recursive Meta-Extrapolative Agent system.

## What is Ultra-Prime?

The Ultra-Prime Agent represents the **highest tier of autonomous development capability** in the Summit/IntelGraph AI agent ecosystem. It applies recursive meta-extrapolation to transform user requests into complete, production-ready solutions.

### Key Characteristics

- **Recursive Meta-Extrapolation**: Analyzes requests through 20+ levels of implication
- **Complete Deliverables**: No TODOs, no placeholders, nothing missing
- **Production-Ready**: Full tests, docs, DevOps, security from day one
- **Innovation-Focused**: Pushes for elegant, cutting-edge solutions
- **Self-Improving**: Continuously evolves based on feedback

### When to Use

✅ **Perfect for:**
- Greenfield projects
- Mission-critical systems
- Research and exploration
- Platform-level features
- When excellence is required

❌ **Not ideal for:**
- Quick bug fixes
- Time-sensitive iterations
- Simple, straightforward tasks
- Cost-sensitive scenarios

## Installation

### Prerequisites

```bash
# Ensure you have Node.js 18+ and pnpm
node --version  # Should be 18+
pnpm --version  # Should be 9+

# Install TypeScript (if not already installed)
pnpm add -g typescript ts-node
```

### Setup

All ultra-prime files are already in the `prompts/` directory:

```
prompts/
├── ultra-prime-recursive-meta-extrapolative.md  # Main prompt
├── tools/
│   └── ultra-prime-engine.ts                    # Implementation
├── scripts/
│   └── ultra-prime-orchestrator.ts              # CLI tool
├── examples/
│   └── ultra-prime-examples.md                  # Use cases
└── __tests__/
    └── ultra-prime-validation.test.ts           # Tests
```

## Quick Start

### Method 1: Direct Prompt Usage

1. **Read the ultra-prime prompt:**
   ```bash
   cat prompts/ultra-prime-recursive-meta-extrapolative.md
   ```

2. **Copy and paste into your AI assistant** (Claude, ChatGPT, etc.)

3. **Provide your request:**
   ```
   Design and implement a comprehensive health check system for our API
   ```

4. **Receive complete output** including:
   - Meta-extrapolation analysis
   - Architecture design
   - Complete implementation
   - Test suite
   - Documentation
   - DevOps configuration
   - Pull request package

### Method 2: CLI Orchestrator

1. **Interactive mode:**
   ```bash
   ts-node prompts/scripts/ultra-prime-orchestrator.ts --interactive --verbose
   ```

2. **From a file:**
   ```bash
   # Create a request file
   echo "Add distributed tracing to the platform" > request.txt

   # Process it
   ts-node prompts/scripts/ultra-prime-orchestrator.ts \
     --file request.txt \
     --output ./ultra-prime-output \
     --verbose
   ```

3. **Inline request:**
   ```bash
   ts-node prompts/scripts/ultra-prime-orchestrator.ts \
     "Implement OAuth2 authentication" \
     --format both
   ```

### Method 3: Programmatic API

```typescript
import { ultraPrime } from './prompts/tools/ultra-prime-engine';

async function main() {
  const output = await ultraPrime.process(
    "Design a distributed caching system"
  );

  console.log('Meta-Extrapolation:', output.metaExtrapolation);
  console.log('Architecture:', output.architecture);
  console.log('Deliverables:', output.deliverables.length);
}

main();
```

## Example Walkthrough

### Scenario: Add Health Check Endpoints

#### Step 1: Provide Request

```
Add a health check endpoint to the API
```

#### Step 2: Ultra-Prime Meta-Extrapolation

The agent identifies that a "simple health check" actually requires:

**Technical Implications (20+ levels):**
- Liveness vs. readiness probes
- Dependency health checks (DB, cache, queue)
- Timeout handling
- Structured response format
- Performance impact < 1ms

**Operational Implications:**
- Kubernetes integration
- Prometheus metrics
- Alerting rules
- Dashboard updates
- Runbook documentation

**Strategic Implications:**
- Team health monitoring patterns
- Future observability needs
- Debugging capabilities

#### Step 3: Architecture Selection

**Candidates generated:**
1. Simple endpoint returning 200 OK
2. Layered health check system
3. Event-driven health monitoring

**Selected:** Layered health check system (highest score: 8.5/10)

#### Step 4: Complete Deliverables

**Implementation:**
```typescript
// src/health/manager.ts
export class HealthManager {
  async checkHealth(): Promise<HealthStatus> {
    // Complete implementation
  }
}

// src/health/endpoints.ts
export function setupHealthEndpoints(app: Express) {
  app.get('/health/live', livenessHandler);
  app.get('/health/ready', readinessHandler);
  app.get('/health/detailed', detailedHandler);
}
```

**Tests:**
```typescript
// src/health/__tests__/manager.test.ts
describe('HealthManager', () => {
  it('should check all registered health checks', async () => {
    // Comprehensive test implementation
  });
});
```

**Documentation:**
```markdown
# Health Check System

## Overview
...

## Endpoints
- GET /health/live - Kubernetes liveness probe
- GET /health/ready - Kubernetes readiness probe
...
```

**DevOps:**
```yaml
# k8s/api-deployment.yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 4000
```

**Pull Request:**
```
feat(health): implement comprehensive health check system

## Summary
Complete health monitoring with Kubernetes integration,
dependency checks, and observability.

## Checklist
- [x] Implementation complete (no TODOs)
- [x] Tests: 100% coverage
- [x] Documentation complete
- [x] Kubernetes probes configured
...
```

#### Step 5: Review and Merge

All deliverables are production-ready. Simply:
1. Review the PR
2. Validate tests pass
3. Merge with confidence

## Advanced Usage

### Custom Extrapolation Levels

You can guide the meta-extrapolation by providing context:

```typescript
import { UltraPrimeEngine } from './prompts/tools/ultra-prime-engine';

const engine = new UltraPrimeEngine();

// Add custom context to guide extrapolation
const request = `
Add health check endpoint

Context:
- We're on AWS EKS
- Using PostgreSQL and Redis
- High traffic (10k req/s)
- PCI compliance required
`;

const output = await engine.process(request);
```

### Integration with Meta-Router

The meta-router automatically selects ultra-prime when appropriate:

```typescript
import { metaRouter } from './prompts/meta-router';

// Router analyzes the request
const task = "Design a new microservice for payment processing";

// Router determines: "This requires ultra-prime agent"
const selectedAgent = metaRouter.route(task);
// => { agent: 'ultra-prime', reason: '...' }
```

### Benchmarking Your Tasks

Use the examples to benchmark expected effort:

| Task Type | Standard | Ultra-Prime | Value Add |
|-----------|----------|-------------|-----------|
| Simple endpoint | 2-4 hours | 6-8 hours | Production-ready, zero debt |
| New service | 2-4 weeks | 3-5 weeks | Complete, documented, automated |
| System design | 1-2 weeks | 2-3 weeks | Comprehensive, validated |

## Troubleshooting

### Issue: Output is too verbose

**Solution:** Use standard agents (Codex, Claude Code) for simpler tasks. Ultra-prime is designed for completeness, not brevity.

### Issue: Takes too long

**Solution:** This is expected. Ultra-prime prioritizes quality over speed. For time-sensitive tasks, use faster agents.

### Issue: Over-engineering

**Solution:** Ensure your request actually requires ultra-prime. Simple tasks should use simpler agents.

## Best Practices

### 1. Front-Load Thinking

The meta-extrapolation phase is critical. Spend time ensuring the request is clear and complete.

### 2. Trust the Process

Don't skip steps for speed. Each phase builds on the previous one.

### 3. Leverage All Deliverables

Ultra-prime generates docs, tests, and DevOps configs. Use them all!

### 4. Iterate on Architecture

If the selected architecture doesn't feel right, refine the candidates before implementation.

### 5. Validate Completeness

Use the integration checklist religiously:
- [ ] Meta-extrapolation complete
- [ ] Implementation has no TODOs
- [ ] Tests comprehensive
- [ ] Documentation complete
- [ ] DevOps configured
- [ ] Quality checks pass
- [ ] Governance validated
- [ ] PR ready

## Next Steps

### Read the Full Prompt

```bash
cat prompts/ultra-prime-recursive-meta-extrapolative.md
```

### Study the Examples

```bash
cat prompts/examples/ultra-prime-examples.md
```

### Run the Tests

```bash
pnpm test prompts/__tests__/ultra-prime-validation.test.ts
```

### Try It Out

```bash
ts-node prompts/scripts/ultra-prime-orchestrator.ts --interactive
```

## Integration with Existing Agents

Ultra-prime sits at the top of the agent hierarchy:

```
┌─────────────────────────┐
│   Ultra-Prime Agent     │ ← Perfection, completeness
├─────────────────────────┤
│   4th-Order Governance  │ ← Inherited by all
├─────────────────────────┤
│ Summit  │ CI/CD  │ Meta │
│ Prompt  │ Prompt │Router│
├─────────────────────────┤
│ Claude │ Codex │ Jules │
│  Code  │       │Gemini │
├─────────────────────────┤
│      Cursor/Warp        │
└─────────────────────────┘
```

All agents inherit from 4th-order governance, but ultra-prime applies it most rigorously.

## Support and Feedback

### Issues

Found a problem? Check:
1. Prompt integrity tests pass: `pnpm test prompts/__tests__`
2. Ultra-prime validation passes: `pnpm test prompts/__tests__/ultra-prime-validation.test.ts`

### Improvements

The ultra-prime prompt is self-improving. Suggest enhancements via PR to:
- `prompts/ultra-prime-recursive-meta-extrapolative.md`

### Questions

See:
- `prompts/examples/ultra-prime-examples.md` for use cases
- `prompts/capability-matrix.md` for agent comparison
- `prompts/meta-router.md` for routing logic

---

## Conclusion

The Ultra-Prime Agent represents the pinnacle of autonomous development capability. Use it when **nothing less than perfect** will do.

**Remember:** The goal is not just to solve the stated problem, but to **solve the right problem perfectly**.

Happy ultra-prime-ing! 🚀

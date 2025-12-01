# AGENT CAPABILITY MATRIX

| Agent              | Capabilities                                            | Ideal Use Cases                                            | Strengths                                  | Limitations                                  |
|--------------------|----------------------------------------------------------|-------------------------------------------------------------|---------------------------------------------|-----------------------------------------------|
| Claude Code        | Deep reasoning, architecture, third-order inference      | Complex features, cross-module behavior, system design       | Long context, architectural insight         | Can be verbose, slower than specialized agents|
| Codex              | Deterministic strict code generation                     | Critical-path features, high-risk code, CI-bound work        | Fast, precise, deterministic                | Less architectural reasoning                  |
| Jules/Gemini       | Cross-file, multimodal, schema harmonization             | Refactors, dataflow fixes, large coherent features           | Multimodal, cross-file coordination         | May need guidance on conventions              |
| Cursor/Warp        | Terminal + editor integration, devloop ops               | Live coding, rapid iteration, environment changes            | Immediate execution, fast feedback          | Limited to dev environment scope              |
| Summit Superprompt | Enterprise-wide multi-service architecture               | IntelGraph/Maestro/Summit ecosystem changes                  | Domain expertise, multi-service coordination| Requires detailed context                     |
| CI/CD Prompt       | Pipeline correctness, gating, SLSA/SBOM provenance       | Build systems, release flows, error budgeting, guardrails    | Pipeline expertise, security focus          | Limited to CI/CD domain                       |

## Selection Guidelines

### By Task Complexity

**Simple Tasks** (1-2 hours):
- Codex for pure implementation
- Cursor/Warp for dev environment

**Medium Tasks** (2-4 hours):
- Claude Code for features with implications
- Jules/Gemini for cross-file refactors

**Complex Tasks** (4+ hours):
- Claude Code for architectural changes
- Summit Superprompt for multi-service changes

### By Risk Level

**Low Risk**:
- Any agent appropriate to task
- Fast iteration encouraged

**Medium Risk**:
- Claude Code or Codex
- Comprehensive testing required

**High Risk**:
- Codex for deterministic correctness
- Summit Superprompt for enterprise changes
- CI/CD Superprompt for pipeline changes

### By Domain

**Application Code**:
- Claude Code (features)
- Codex (critical paths)
- Jules/Gemini (refactors)

**Infrastructure**:
- CI/CD Superprompt (pipelines)
- Cursor/Warp (dev environment)

**Enterprise Integration**:
- Summit Superprompt (multi-service)
- Jules/Gemini (type harmonization)

## Performance Characteristics

### Speed
1. Codex (fastest)
2. Cursor/Warp
3. Jules/Gemini
4. Claude Code
5. Summit Superprompt
6. CI/CD Superprompt

### Correctness
1. Codex (deterministic)
2. CI/CD Superprompt
3. Claude Code
4. Summit Superprompt
5. Jules/Gemini
6. Cursor/Warp

### Comprehensiveness
1. Claude Code
2. Summit Superprompt
3. Jules/Gemini
4. CI/CD Superprompt
5. Codex
6. Cursor/Warp

This table guides agent selection in Maestro Conductor and manual task routing.

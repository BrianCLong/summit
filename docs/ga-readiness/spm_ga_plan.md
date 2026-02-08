# GA Readiness Plan: Skill Preserving Mode (SPM)

## Objective
Transition the Skill Preserving Mode (SPM) from an experimental stub to a production-ready feature (GA).

## Requirements
1. **Dynamic Routing**: Correctly identify when SPM should be active based on feature flags, organizational policy, and user settings.
2. **Behavior Enforcement**: Provide prompt augmentations that:
    - Force the agent to ask for a plan before execution.
    - Provide conceptual explanations instead of direct solutions.
3. **Observability**: Log routing decisions and enforcement actions for auditability.
4. **Reliability**: Handle malformed context and edge cases gracefully.

## Prompt Strategy
- **Baseline**: Standard system prompt.
- **SPM Active**:
    - Inject: "You are in Skill Preserving Mode. Before executing any task, you must ask the user for their proposed plan. Provide conceptual guidance and avoid direct code generation unless the user's plan is verified."
    - Inject: "Explain the 'why' behind your suggestions to ensure the user maintains mastery of the domain."

## Gap Analysis
| Component | Current State | GA Target | Gap |
|-----------|---------------|-----------|-----|
| Routing Logic | Basic `if/else` | Robust, logged, validated | Needs logging and error handling |
| Enforcement | None | `spm_enforcer` module | Missing implementation |
| Tests | Basic unit tests | >80% coverage with edge cases | Needs more comprehensive tests |
| Documentation | Basic overview | User & Developer guides, ADR | Needs expansion |

## Roadmap
1. Refactor Router (Step 3)
2. Implement Enforcer (Step 4)
3. Activate Flag (Step 5)
4. Comprehensive Testing (Steps 7-9)

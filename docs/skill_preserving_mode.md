# Skill Preserving Mode (SPM) - General Availability (GA)

## Overview
Skill Preserving Mode (SPM) is a production-ready interaction mode in Summit designed to prevent skill atrophy when using AI assistance.
SPM ensures that the user remains the primary decision-maker and develops deep mastery of the subject matter.

## Key Features
- **Mandatory Planning**: The AI will always request the user's plan before offering suggestions or executing tasks.
- **Conceptual Guidance**: Focuses on explaining principles and patterns rather than providing copy-paste solutions.
- **Decision Auditing**: All routing decisions are logged for enterprise compliance.

## How it Works
SPM is controlled by a multi-tier policy:
1. **Global Flag**: `SKILL_PRESERVING_MODE` must be `true` in `feature_flags.json`.
2. **Organizational Policy**: The `org_policy` must have `allow_skill_preserving: true`.
3. **User Opt-in**: The user must explicitly opt-in via `user_settings.opt_in_skill_preserving`.

## Developer Guide
### Integration
To integrate SPM into an agent loop, use the `PolicyRouter` and `SPMEnforcer`:

```python
from summit.policy.router import route
from summit.policy.spm_enforcer import SPMEnforcer

# 1. Determine policy
decision = route(context)

# 2. Get prompt augmentations
enforcer = SPMEnforcer()
augmentations = enforcer.get_prompt_augmentations(decision)

# 3. Apply to system prompt
final_prompt = enforcer.wrap_system_prompt(original_prompt, decision)
```

### Logging
Decision logs are available under the `summit.policy` namespace.

## Compliance and Security
SPM adherence is part of the Summit Governance framework. Organizations can enforce SPM for specific user groups or projects to ensure skill retention in critical domains.

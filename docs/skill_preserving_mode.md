# Skill Preserving Mode (SPM)

## Overview
SPM is a new interaction mode in Summit designed to prevent skill atrophy when using AI assistance for learning or new domains.
Based on research (arXiv:2601.20245), full delegation to AI can reduce mastery by ~17%.

## Behavior
When enabled, Summit will:
1. Ask for your plan before generating code.
2. Provide conceptual explanations.
3. Encourage you to verify the output.
4. Avoid giving full solutions immediately ("do it for me").

## Configuration
Enable via feature flag: `SKILL_PRESERVING_MODE: true`.
Can also be triggered by "learning context" signals (future work).

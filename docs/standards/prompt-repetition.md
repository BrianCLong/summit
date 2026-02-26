# Prompt Repetition Policy

## Overview
Prompt repetition can be beneficial or harmful depending on its structure.
This policy enforces guidelines to maximize beneficial repetition (reinforcement) and minimize harmful repetition (redundancy).

## Classification
- **Beneficial**: Short, punchy repetitions of key instructions (e.g., "Do not halluncinate. Do not hallucinate.").
- **Harmful**: Long, verbose blocks of text repeated verbatim.

## Enforcement
The `RepetitionPolicyRule` scans prompts for harmful repetition.
- Threshold: Repetition score > 500 triggers a flag.
- Action: Flagged prompts may be rejected or logged for review.

## Transforms
The `Constraint Reinforcement Transform` automatically appends a structured constraint block to prompts that lack it, ensuring critical instructions are adhered to.

## Benchmarking
Run `python3 scripts/bench_repetition.py` to evaluate prompt hygiene.
Artifacts are saved to `artifacts/repetition/`.

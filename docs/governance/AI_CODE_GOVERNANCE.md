# AI-Authored Code Governance Policy

## Overview
Recent research (MSR '26) has identified significant risks in AI-generated code, specifically **higher semantic redundancy (Type-4 clones)** and **reviewer bias** caused by surface plausibility. This policy establishes mandatory CI gates and reviewer protocols to mitigate these risks within the Summit platform.

## Redundancy Gate (Max-Redundancy-Score)
To prevent the accumulation of redundancy-driven technical debt, all AI-authored Pull Requests must pass the following redundancy threshold:

- **Local Redundancy Score (LRS):** Must be **< 2.0%**. This measures the percentage of duplicated blocks within the PR's changed files.
- **Global Redundancy Delta (GRD):** (Experimental) Must be **< 0.5%**. This measures the increase in total repository redundancy introduced by the PR. Currently enforced via manual review or baseline comparison scripts.

The LRS is automatically calculated using `jscpd` during the CI pipeline.

## Reviewer Awareness Protocols
Reviewers of AI-generated PRs must adhere to the following guidelines to counteract surface plausibility bias:

1. **Mandatory Deep Logic Review:** AI code often looks "correct" at first glance but may contain subtle semantic redundancies or sub-optimal reuse. Reviewers must explicitly verify if existing utility functions could have been used instead.
2. **Reuse-First Assertion:** The author (or agent) must demonstrate that they have searched the codebase for existing implementations of the logic.
3. **Complexity Check:** AI agents tend to favor "clean-sheet" implementations over integrating with complex existing abstractions. Reviewers must flag cases where integration was avoided in favor of duplication.

## Automated Reviewer Prompts
The CI pipeline will automatically post a **Reviewer Awareness Prompt** on any PR identified as AI-authored, highlighting these research-backed risks and providing the PR's specific Redundancy Scores.

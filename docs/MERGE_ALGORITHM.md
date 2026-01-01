# UX Findings Merge Algorithm

This document outlines the algorithm for merging and prioritizing UX findings from the three specialist agents (Modernist, Architect, Human Factors) into a single, actionable backlog. This algorithm is to be executed by the **UX Arbiter** agent.

## Inputs
*   `modernist_findings.json`: Array of finding objects from the Modernist.
*   `architect_findings.json`: Array of finding objects from the Architect.
*   `human_factors_findings.json`: Array of finding objects from the Human Factors specialist.

### Finding Object Schema (Example)
```json
{
  "id": "HF-001",
  "location": "/payment/confirmation",
  "issue": "The 'Confirm Purchase' button does not have a confirmation dialog, risking accidental double-charges.",
  "recommendation": "Add a modal confirmation dialog that restates the purchase amount before finalizing.",
  "rationale": "Prevents irreversible user error with financial consequences. High-stakes actions require explicit confirmation."
}
```

## Algorithm Steps

### 1. Ingestion and Normalization
-   Combine all findings from the three input files into a single master list called `all_findings`.
-   Add a `source` field to each finding object (e.g., `source: 'Human Factors'`).
-   Assign a unique `finding_id` to each object for tracking.

### 2. Deduplication and Grouping (Synthesizing)
-   Create an empty dictionary called `grouped_findings`.
-   Iterate through `all_findings`:
    -   For each finding, generate a "similarity key". This key should be based on the `location` and a normalized representation of the `issue`. For example, `/payment/confirmation:button-confirmation`. This step is heuristic and may require fuzzy matching or NLP techniques for robustness.
    -   If the similarity key is not in `grouped_findings`, add it with a new entry containing the current finding.
    -   If the similarity key already exists, append the current finding's `id`, `source`, and `recommendation` to the existing entry. This creates a single "issue" that multiple agents have commented on.

### 3. Conflict Identification
-   Iterate through `grouped_findings`:
    -   For each grouped finding with more than one source, check if the `recommendations` are contradictory.
    -   A conflict exists if one recommendation is a direct opposite of another (e.g., "remove confirmation" vs. "add confirmation") or proposes a mutually exclusive UI change.
    -   Tag these groups with `conflict: true`.

### 4. Prioritization (Applying Heuristics)
-   Iterate through `grouped_findings`:
    -   For each group, assign a priority score based on the **UX Arbiter's Decision-Making Framework**.
    -   **Scoring Algorithm (Example):**
        -   Initialize `score = 0`.
        -   If any source is `Human Factors`, `score += 100` (Safety & Trust).
        -   If any source is `Architect`, `score += 50` (Clarity & Coherence).
        -   If any source is `Modernist`, `score += 20` (Craft & Aesthetics).
        -   If the issue involves keywords like "data loss", "security", "irreversible", "crash", `score += 200`.
        -   If `conflict: true`, flag for manual review in the output. The Arbiter's main prompt logic takes precedence here.
    -   Convert the final score to a P-level priority:
        -   `score >= 200`: P0-Critical
        -   `100 <= score < 200`: P1-High
        -   `50 <= score < 100`: P2-Medium
        -   `score < 50`: P3-Low

### 5. Final Decision and Justification (Arbitration)
-   Iterate through the prioritized `grouped_findings`:
    -   For each group, generate the final `Task` description.
    -   If `conflict: true`:
        -   Apply the Arbiter's heuristic hierarchy (Safety > Clarity > Coherence > Craft).
        -   Select the recommendation from the highest-priority source.
        -   Generate a `Justification` string explaining the conflict and the reason for the decision (e.g., "Conflict between Modernist and Human Factors. Sided with Human Factors because preventing user error is a higher priority than aesthetic minimalism in this context.").
    -   If no conflict, synthesize the recommendations into a single task.

## Outputs
-   **`UX_ARBITRATION_LOG.md`**: A Markdown file as specified in the UX Arbiter prompt.
-   **(Optional) `backlog.json`**: A structured JSON file of the final, prioritized backlog for programmatic use.

### `backlog.json` Schema (Example)
```json
[
  {
    "priority": "P0-Critical",
    "task": "Add a modal confirmation dialog to the 'Confirm Purchase' button on the payment screen.",
    "sources": ["Human Factors", "Architect"],
    "justification": "Critical to prevent irreversible financial errors. Human Factors and Architect both flagged related issues.",
    "original_ids": ["HF-001", "ARCH-042"]
  }
]
```

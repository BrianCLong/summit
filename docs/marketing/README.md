# Summit Marketing & Pitch Artifacts

This directory contains the authoritative marketing and pitch artifacts for Summit, generated and maintained using the **Marketing & Pitch System Generator**.

## Workflow

The marketing artifacts are managed via a two-layer prompt system located in `prompts/`:

1.  **Master Generator** (`prompts/marketing.master-generator@v1.yaml`):
    *   Generates the initial corpus of artifacts.
    *   Ensures consistency across the entire documentation set.
    *   Audits existing artifacts against the current roadmap.

2.  **Artifact Perfection Agent** (`prompts/marketing.artifact-perfection@v1.yaml`):
    *   Refines specific artifacts (e.g., a single pitch deck slide, a blog post).
    *   Enforces strict style, tone, and accuracy guidelines.

## Directory Structure

*   `core/` - Core narrative, positioning, and problem framing.
*   `product/` - Technical and executive product overviews.
*   `decks/` - Pitch deck content (slide-by-slide).
*   `web/` - Website copy, landing pages, use cases.
*   `sales/` - Enablement materials, battle cards, pricing.
*   `proof/` - Case studies, reference architectures, security postures.
*   `press/` - Press releases, analyst briefings.

## Usage

To generate or update an artifact:

1.  Select the appropriate prompt from `prompts/`.
2.  Provide the necessary context (e.g., "Update the Series A deck for Q3 2024").
3.  Review the output using the **Artifact Perfection Agent** if needed.
4.  Commit the result to this directory.

## Governance

All changes to marketing artifacts must be:
*   Versioned in Git.
*   Reviewed by the relevant stakeholders (Product, Engineering, Sales).
*   Aligned with the latest `prompts/marketing.master-generator@v1.yaml` guidelines.

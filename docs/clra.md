# Cognitive Load Reduction Assistant (CLRA)

The CLRA reduces analyst fatigue by distilling high‑volume intelligence feeds into
focused insights. Core capabilities include:

- **Automatic summarisation** of text feeds. Besides returning the first few
  sentences, a simple frequency‑based mode extracts the most information‑dense
  lines.
- **Graph change detection** that highlights newly discovered and removed
  relationships (e.g., `New link found between malware cluster X and actor Y`).
- **Weighted event prioritisation** where configurable keyword weights determine
  the ordering of alerts.
- **Contextual linking** to surface first and second‑degree connections for a given
  entity, allowing rapid exploration without navigating the entire graph.
- **Trending entity extraction** across multiple feeds to surface recurring
  topics or actors of interest.

This module is a foundation for richer LLM‑based reasoning pipelines and adaptive
UI components that tailor themselves to an analyst's behaviour and role.

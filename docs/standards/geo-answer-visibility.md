# GEO Answer Visibility Standards

## Overview
This document defines standard operating procedures and measurement methodologies for Generative Engine Optimization within the Summit repository.

## Measurements
1. **Eligibility**: Could the brand logically be retrieved or generated?
2. **Selection**: Was the brand explicitly recommended in the final answer?
3. **Attribution**: Was a domain/source explicitly cited in support of the answer?
4. **Upstream Prior**: Visibility predicted purely from traditional web search index prominence.
5. **Corrected Lift**: AI engine preference, calculated as `(Selection * 0.7 + Attribution * 0.3) - Upstream Prior`.

## Determinism
Reports (`report.json`) and metrics (`metrics.json`) MUST exclude wall-clock timestamps to guarantee reproducibility in CI/CD environments. Time-based metadata should only go into `stamp.json`.

"""Cognitive Battlespace Map (CBM) subsystem.

CBM is a pipeline + graph + query layer that:
  1. Builds a Narrative/Belief Graph (claims → frames → narratives → audiences)
  2. Builds an Influence Graph (actors/assets → channels → amplification paths)
  3. Builds an AI Exposure Graph (sources → corpora/retrieval → LLM outputs)
  4. Correlates with hybrid incidents
  5. Produces deterministic, machine-verifiable artifacts and drift signals

All capabilities are behind feature flags (default OFF).

Evidence ID pattern: EVID-CBM-<YYYYMMDD>-<RUNHASH>-<SEQ>
"""

from .pipeline import CBMConfig, run_cbm
from .schema import DocumentEvent

__all__ = ["CBMConfig", "DocumentEvent", "run_cbm"]

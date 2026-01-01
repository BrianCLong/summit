from datetime import datetime
from types import SimpleNamespace

from summit.context.analysis import DivergenceAnalyzer
from summit.context.counterfactual import CCRConfig, CounterfactualContextReassembler
from summit.context.trust import TrustWeightedContextAssembler
from summit.context.types import (
  ContextSegment,
  ContextSegmentMetadata,
  ModelExecutionResponse,
  TrustWeight,
)


def _segment(segment_id: str, weight: float) -> ContextSegment:
  return ContextSegment(
    metadata=ContextSegmentMetadata(
      id=segment_id,
      source="test",
      created_at=datetime.utcnow(),
      labels=[],
    ),
    content=segment_id,
    trust_weight=TrustWeight(value=weight),
    invariants=[],
  )


def test_ccr_generates_variants():
  assembler = TrustWeightedContextAssembler(max_segments=5)
  ccr = CounterfactualContextReassembler(assembler, CCRConfig(max_variants=10))
  variants = ccr.generate_variants("base", [_segment("s1", 1.0), _segment("s2", 0.5)])
  assert len(variants) == 4
  assert {variant.modification.split(":")[0] for variant in variants} == {"removal", "attenuate"}


def test_divergence_detection_flags_changes():
  analyzer = DivergenceAnalyzer(threshold=0.1)
  base_response = ModelExecutionResponse(
    request_id="r1", model_id="model", output="stable"
  )
  variants = {
    "v1": ModelExecutionResponse(request_id="r1", model_id="model", output="stable"),
    "v2": ModelExecutionResponse(request_id="r1", model_id="model", output="shift"),
  }
  variant_meta = [
    SimpleNamespace(id="v1", modification="removal:s1", context=None),
    SimpleNamespace(id="v2", modification="attenuate:s2", context=None),
  ]

  scores = analyzer.score_responses(base_response, variants, variant_meta)
  indicators = analyzer.detect_poisoning(scores)

  assert len(scores) == 2
  assert any(ind.segment_id == "s2" for ind in indicators)

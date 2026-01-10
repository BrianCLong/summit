from datetime import datetime

from intelgraph.context.counterfactual import CCRConfig, CounterfactualContextReassembler
from intelgraph.context.trust import TrustWeightedContextAssembler
from intelgraph.context.types import (
    AssembledContext,
    ContextSegment,
    ContextSegmentMetadata,
    ModelExecutionRequest,
    ModelExecutionResponse,
    TrustWeight,
)


def make_segment(segment_id: str, weight: float = 1.0) -> ContextSegment:
    return ContextSegment(
        metadata=ContextSegmentMetadata(id=segment_id, source="user", created_at=datetime.utcnow(), labels=[]),
        content=f"segment-{segment_id}",
        trust_weight=TrustWeight(value=weight),
        invariants=[],
    )


def test_counterfactual_variants_are_created():
    assembler = TrustWeightedContextAssembler(default_max_segments=10)
    context = AssembledContext(id="ctx", segments=[make_segment("a"), make_segment("b")], encoded=None)
    request = ModelExecutionRequest(context=context, model_id="demo", input="hello")

    reassembler = CounterfactualContextReassembler(
        assembler, CCRConfig(attenuate_factor=0.3, max_variants=3, include_isolation=True)
    )
    variants = reassembler.build_variants(request)

    assert variants
    assert any(variant.mutation == "remove" for variant in variants)
    assert any(variant.mutation == "attenuate" for variant in variants)
    assert any(variant.mutation == "reorder" for variant in variants)
    assert any(variant.mutation == "isolate" for variant in variants)


def test_divergence_analysis_flags_changes():
    assembler = TrustWeightedContextAssembler(default_max_segments=5)
    context = AssembledContext(id="ctx", segments=[make_segment("x")], encoded=None)
    request = ModelExecutionRequest(context=context, model_id="demo", input="hello")
    reassembler = CounterfactualContextReassembler(assembler)

    variants = reassembler.build_variants(request)
    base_response = ModelExecutionResponse(request_id="base", model_id="demo", output="ok")
    variant_responses = [ModelExecutionResponse(request_id=variant.id, model_id="demo", output="different") for variant in variants]

    divergence = reassembler.analyze_responses(base_response, variant_responses)

    assert divergence
    assert all(score["divergence"] >= 0 for score in divergence)

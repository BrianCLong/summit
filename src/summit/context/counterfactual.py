from __future__ import annotations

from dataclasses import dataclass
from typing import List
from uuid import uuid4

from .trust import TrustWeightedContextAssembler
from .types import AssembledContext, ContextSegment, ModelExecutionRequest, ModelExecutionResponse, ModelExecutor


@dataclass
class CounterfactualVariant:
  id: str
  modification: str
  context: AssembledContext


@dataclass
class CCRConfig:
  max_variants: int | None = None
  attenuation_weight: float = 0.1


class CounterfactualContextReassembler:
  def __init__(
    self,
    assembler: TrustWeightedContextAssembler,
    config: CCRConfig | None = None,
    executor: ModelExecutor | None = None,
  ) -> None:
    self.assembler = assembler
    self.config = config or CCRConfig()
    self.executor = executor

  def build_base_context(self, context_id: str, segments: List[ContextSegment]) -> AssembledContext:
    return self.assembler.assemble(context_id, segments)

  def generate_variants(self, base_id: str, segments: List[ContextSegment]) -> List[CounterfactualVariant]:
    variants: List[CounterfactualVariant] = []
    limit = self.config.max_variants or len(segments) * 2

    for segment in segments:
      remaining = [candidate for candidate in segments if candidate.metadata.id != segment.metadata.id]
      variants.append(
        CounterfactualVariant(
          id=str(uuid4()),
          modification=f"removal:{segment.metadata.id}",
          context=self.assembler.assemble(f"{base_id}:remove:{segment.metadata.id}", remaining),
        )
      )

      attenuated: List[ContextSegment] = []
      for candidate in segments:
        if candidate.metadata.id == segment.metadata.id:
          attenuated.append(
            ContextSegment(
              metadata=candidate.metadata,
              content=candidate.content,
              trust_weight=type(candidate.trust_weight)(
                value=candidate.trust_weight.value * self.config.attenuation_weight,
                rationale=candidate.trust_weight.rationale,
              ),
              invariants=candidate.invariants,
            )
          )
        else:
          attenuated.append(candidate)

      variants.append(
        CounterfactualVariant(
          id=str(uuid4()),
          modification=f"attenuate:{segment.metadata.id}",
          context=self.assembler.assemble(
            f"{base_id}:attenuate:{segment.metadata.id}",
            attenuated,
          ),
        )
      )

    return variants[:limit]

  def execute_across_variants(
    self, base_request: ModelExecutionRequest
  ) -> tuple[ModelExecutionResponse, dict[str, ModelExecutionResponse]]:
    if not self.executor:
      raise ValueError("No executor provided for CCR execution")

    base_response = self.executor.execute(base_request)
    variant_responses = self._run_variants(base_request)
    return base_response, variant_responses

  def _run_variants(self, base_request: ModelExecutionRequest) -> dict[str, ModelExecutionResponse]:
    if not self.executor:
      raise ValueError("No executor provided for CCR execution")

    responses: dict[str, ModelExecutionResponse] = {}
    for variant in self.generate_variants(base_request.context.id, base_request.context.segments):
      responses[variant.id] = self.executor.execute(
        ModelExecutionRequest(
          context=variant.context,
          model_id=base_request.model_id,
          model_input=base_request.model_input,
        )
      )
    return responses

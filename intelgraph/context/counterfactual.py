from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List, Protocol

from .trust import TrustWeightedContextAssembler
from .types import AssembledContext, ContextSegment, ModelExecutionRequest, ModelExecutionResponse

CounterfactualMutationType = str


@dataclass(slots=True)
class CounterfactualVariant:
    id: str
    mutation: CounterfactualMutationType
    mutated_segment_id: str | None
    request: ModelExecutionRequest


@dataclass(slots=True)
class CCRConfig:
    attenuate_factor: float = 0.5
    max_variants: int = 5
    include_isolation: bool = True


class DivergenceStrategy(Protocol):
    def __call__(self, base_output: Any, variant_output: Any) -> float:
        ...


class CounterfactualContextReassembler:
    def __init__(
        self,
        assembler: TrustWeightedContextAssembler,
        config: CCRConfig | None = None,
        divergence_strategy: DivergenceStrategy | None = None,
    ) -> None:
        self.assembler = assembler
        self.config = config or CCRConfig()
        self.divergence_strategy = divergence_strategy or self._default_divergence

    def build_variants(self, request: ModelExecutionRequest) -> List[CounterfactualVariant]:
        variants: List[CounterfactualVariant] = []
        segments = request.context.segments[: self.config.max_variants]
        for index, segment in enumerate(segments):
            variants.append(self._build_removal_variant(request, segment))
            variants.append(self._build_attenuation_variant(request, segment))
            if self.config.include_isolation:
                variants.append(self._build_isolation_variant(request, segment))
            if index + 1 < len(segments):
                variants.append(self._build_reorder_variant(request, segment.metadata.id, index + 1))
        return variants

    def analyze_responses(
        self, base_response: ModelExecutionResponse, variant_responses: List[ModelExecutionResponse]
    ) -> List[dict[str, float | str]]:
        return [
            {
                "variant_id": response.request_id,
                "divergence": self.divergence_strategy(base_response.output, response.output),
            }
            for response in variant_responses
        ]

    def _build_removal_variant(self, request: ModelExecutionRequest, segment: ContextSegment) -> CounterfactualVariant:
        remaining = [candidate for candidate in request.context.segments if candidate.metadata.id != segment.metadata.id]
        context = self.assembler.assemble(remaining)
        return CounterfactualVariant(
            id=self._build_variant_id(request, "remove", segment.metadata.id),
            mutation="remove",
            mutated_segment_id=segment.metadata.id,
            request=ModelExecutionRequest(context=context, model_id=request.model_id, input=request.input),
        )

    def _build_attenuation_variant(self, request: ModelExecutionRequest, segment: ContextSegment) -> CounterfactualVariant:
        attenuated: List[ContextSegment] = []
        for candidate in request.context.segments:
            if candidate.metadata.id == segment.metadata.id:
                attenuated.append(
                    ContextSegment(
                        metadata=candidate.metadata,
                        content=candidate.content,
                        trust_weight=type(candidate.trust_weight)(
                            value=candidate.trust_weight.value * self.config.attenuate_factor,
                            rationale=f"attenuated by {self.config.attenuate_factor}",
                        ),
                        invariants=candidate.invariants,
                    )
                )
            else:
                attenuated.append(candidate)
        context = self.assembler.assemble(attenuated)
        return CounterfactualVariant(
            id=self._build_variant_id(request, "attenuate", segment.metadata.id),
            mutation="attenuate",
            mutated_segment_id=segment.metadata.id,
            request=ModelExecutionRequest(context=context, model_id=request.model_id, input=request.input),
        )

    def _build_isolation_variant(self, request: ModelExecutionRequest, segment: ContextSegment) -> CounterfactualVariant:
        context = self.assembler.assemble([segment])
        return CounterfactualVariant(
            id=self._build_variant_id(request, "isolate", segment.metadata.id),
            mutation="isolate",
            mutated_segment_id=segment.metadata.id,
            request=ModelExecutionRequest(context=context, model_id=request.model_id, input=request.input),
        )

    def _build_reorder_variant(
        self, request: ModelExecutionRequest, segment_id: str, swap_index: int
    ) -> CounterfactualVariant:
        copy = list(request.context.segments)
        current_index = next((idx for idx, candidate in enumerate(copy) if candidate.metadata.id == segment_id), -1)
        if current_index == -1 or swap_index >= len(copy):
            return CounterfactualVariant(
                id=self._build_variant_id(request, "reorder", segment_id, suffix="noop"),
                mutation="reorder",
                mutated_segment_id=segment_id,
                request=request,
            )
        segment = copy.pop(current_index)
        copy.insert(swap_index, segment)
        context = self.assembler.assemble(copy)
        return CounterfactualVariant(
            id=self._build_variant_id(request, "reorder", segment_id, suffix=f"to-{swap_index}"),
            mutation="reorder",
            mutated_segment_id=segment_id,
            request=ModelExecutionRequest(context=context, model_id=request.model_id, input=request.input),
        )

    @staticmethod
    def _default_divergence(base_output: Any, variant_output: Any) -> float:
        if isinstance(base_output, (int, float)) and isinstance(variant_output, (int, float)):
            denom = max(1.0, abs(base_output), abs(variant_output))
            return abs(base_output - variant_output) / denom
        if isinstance(base_output, str) and isinstance(variant_output, str):
            return 0.0 if base_output == variant_output else 1.0
        return 0.0 if _stable_stringify(base_output) == _stable_stringify(variant_output) else 1.0

    @staticmethod
    def _build_variant_id(
        request: ModelExecutionRequest, mutation: str, segment_id: str, suffix: str | None = None
    ) -> str:
        sanitized = segment_id.replace(" ", "-")
        suffix_value = f"-{suffix}" if suffix else ""
        return f"{request.context.id}-{mutation}-{sanitized}{suffix_value}"


def _stable_stringify(value: Any) -> str:
    if value is None or isinstance(value, (str, int, float, bool)):
        return str(value)
    if isinstance(value, list):
        return "[" + ",".join(_stable_stringify(item) for item in value) + "]"
    if isinstance(value, dict):
        items = sorted((str(key), _stable_stringify(val)) for key, val in value.items())
        return "{" + ",".join(f"{key}:{val}" for key, val in items) + "}"
    return str(value)

import json
import os
import re
from typing import Any

import openai
from intelgraph_py.cache import (
    generate_cache_key,
    get_cached_explanation,
    set_cached_explanation,
)
from langchain_community.chat_models import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

openai.api_key = os.getenv("OPENAI_API_KEY")


class ExplanationOutput(BaseModel):
    explanation_text: str = Field(..., description="Natural language explanation of the insight.")
    confidence_score: float = Field(
        ..., ge=0.0, le=1.0, description="Confidence score of the explanation (0.0 to 1.0)."
    )
    source_metadata: dict[str, Any] = Field(
        ..., description="Metadata of the source data used for explanation."
    )
    semantic_summary: str = Field(..., description="A concise semantic summary of the explanation.")


class PromptGenerator:
    @staticmethod
    def generate_prompt(insight_data: dict[str, Any]) -> str:
        insight_type = insight_data.get("insight_type")
        prompt_parts = [
            "Generate a natural language explanation for the following AI-derived graph insight.",
            "The explanation should be clear, concise, and factually accurate.",
            "Provide a confidence score (0.0-1.0), reference source metadata, and a semantic summary.",
            "Return the output as a JSON object with keys: explanation_text, confidence_score, source_metadata, semantic_summary.",
        ]

        if insight_type == "community_detection":
            prompt_parts.append("Insight Type: Community Detection")
            if insight_data.get("community_id") is not None:
                prompt_parts.append(f"- Community ID: {insight_data['community_id']}")
            if insight_data.get("nodes"):
                prompt_parts.append(f"- Nodes in this insight: {', '.join(insight_data['nodes'])}")
            prompt_parts.append(
                "Explain why these nodes form a community and what characterizes it."
            )
        elif insight_type == "centrality":
            prompt_parts.append("Insight Type: Centrality Analysis")
            if insight_data.get("central_node_id"):
                prompt_parts.append(f"- Central Node ID: {insight_data['central_node_id']}")
            prompt_parts.append(
                "Explain the significance of this node's centrality within the graph."
            )
        else:
            prompt_parts.append("Insight Data:")
            for key, value in insight_data.items():
                prompt_parts.append(f"- {key}: {value}")
            prompt_parts.append("Explain this general graph insight.")

        return "\n".join(prompt_parts)


def _obfuscate_text(text: str) -> str:
    text = re.sub(r"Node\s+[A-Za-z0-9]+", "Node [redacted]", text)
    text = re.sub(r"community\s+[A-Za-z0-9]+", "community [redacted]", text, flags=re.IGNORECASE)
    return text


def _adapt_for_authority(expl: ExplanationOutput, authority: str) -> ExplanationOutput:
    if authority == "external":
        expl.explanation_text = _obfuscate_text(expl.explanation_text)
        expl.source_metadata = {}
    return expl


async def generate_explanation(
    insight_data: dict[str, Any],
    llm_model: str = "gpt-4o",
    authority: str = "internal",
    temperature: float = 0.2,
    max_tokens: int = 256,
) -> ExplanationOutput:
    cache_key = generate_cache_key(insight_data, llm_model, authority)
    cached = get_cached_explanation(cache_key)
    if cached:
        return ExplanationOutput(**cached)

    system_message = (
        "You are an expert graph analyst and AI explainability engine. "
        "Your task is to explain complex graph insights in an understandable manner."
    )
    user_message = PromptGenerator.generate_prompt(insight_data)

    try:
        if llm_model.startswith("gpt-"):
            if not openai.api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set.")
            response = await openai.ChatCompletion.acreate(
                model=llm_model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )
            llm_output = response.choices[0].message.content
        else:
            llm = ChatOllama(model=llm_model, temperature=temperature, num_predict=max_tokens)
            messages = [
                SystemMessage(content=system_message),
                HumanMessage(content=user_message),
            ]
            response = await llm.ainvoke(messages)
            llm_output = response.content

        parsed_output = json.loads(llm_output)
        explanation_output = ExplanationOutput(
            explanation_text=parsed_output.get("explanation_text", ""),
            confidence_score=parsed_output.get("confidence_score", 0.0),
            source_metadata=parsed_output.get("source_metadata", {}),
            semantic_summary=parsed_output.get("semantic_summary", ""),
        )
        explanation_output = _adapt_for_authority(explanation_output, authority)
        set_cached_explanation(cache_key, explanation_output.dict())
        return explanation_output
    except Exception as e:
        return ExplanationOutput(
            explanation_text=f"Failed to generate explanation: {e}",
            confidence_score=0.0,
            source_metadata=insight_data,
            semantic_summary="Error during explanation generation.",
        )

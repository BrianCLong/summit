from pydantic import BaseModel, Field
from typing import List, Dict, Any
import openai
import os
import json
from langchain_community.chat_models import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from intelgraph_py.cache import generate_cache_key, get_cached_explanation, set_cached_explanation

# Set your OpenAI API key
# It's recommended to load this from environment variables
openai.api_key = os.getenv("OPENAI_API_KEY")

class ExplanationOutput(BaseModel):
    explanation_text: str = Field(..., description="Natural language explanation of the insight.")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score of the explanation (0.0 to 1.0).")
    source_metadata: Dict[str, Any] = Field(..., description="Metadata of the source data used for explanation.")
    semantic_summary: str = Field(..., description="A concise semantic summary of the explanation.")

async def generate_explanation(
    insight_data: Dict[str, Any],
    llm_model: str = "gpt-4o",
    temperature: float = 0.7,
    max_tokens: int = 500
) -> ExplanationOutput:
    """
    Generates a natural language explanation for AI-derived graph insights.

    Args:
        insight_data: A dictionary containing the AI insight data.
                      Expected keys: 'insight_type' (e.g., 'community_detection', 'centrality'),
                      'nodes' (list of node IDs), 'edges' (list of edge details),
                      'community_id' (for community insights), 'central_node_id' (for centrality insights), etc.
        llm_model: The LLM model to use for generation (e.g., "gpt-4o", "llama3").
        temperature: Controls the randomness of the output.
        max_tokens: The maximum number of tokens to generate.

    Returns:
        An ExplanationOutput object containing the explanation, confidence, metadata, and summary.
    """
    cache_key = generate_cache_key(insight_data, llm_model)
    cached_explanation = get_cached_explanation(cache_key)
    if cached_explanation:
        return ExplanationOutput(**cached_explanation)

    system_message = "You are an expert graph analyst and AI explainability engine. Your task is to explain complex graph insights in an understandable manner."
    prompt_template = (
        "Generate a natural language explanation for the following AI-derived graph insight."
        "The explanation should be clear, concise, and factually accurate."
        "Provide a confidence score (0.0-1.0), reference source metadata, and a semantic summary."
        "Return the output as a JSON object with keys: explanation_text, confidence_score, source_metadata, semantic_summary."
        "Insight Data:"
    )
    prompt_parts = [prompt_template]
    for key, value in insight_data.items():
        prompt_parts.append(f"- {key}: {value}")
    user_message_content = "\n".join(prompt_parts)

    try:
        if llm_model.startswith("gpt-"):
            if not openai.api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set.")
            response = await openai.ChatCompletion.acreate(
                model=llm_model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message_content}
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"}
            )
            llm_output = response.choices[0].message.content
        else: # Assume local LLM via Ollama
            llm = ChatOllama(model=llm_model, temperature=temperature, num_predict=max_tokens)
            messages = [
                SystemMessage(content=system_message),
                HumanMessage(content=user_message_content)
            ]
            response = await llm.ainvoke(messages)
            llm_output = response.content

        parsed_output = json.loads(llm_output)

        explanation_output = ExplanationOutput(
            explanation_text=parsed_output.get("explanation_text", ""),
            confidence_score=parsed_output.get("confidence_score", 0.0),
            source_metadata=parsed_output.get("source_metadata", {{}}),
            semantic_summary=parsed_output.get("semantic_summary", "")
        )
        set_cached_explanation(cache_key, explanation_output.dict())
        return explanation_output
    except Exception as e:
        print(f"Error generating explanation: {e}")
        return ExplanationOutput(
            explanation_text=f"Failed to generate explanation: {e}",
            confidence_score=0.0,
            source_metadata=insight_data,
            semantic_summary="Error during explanation generation."
        )

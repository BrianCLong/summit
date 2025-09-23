from pydantic import BaseModel, Field
from typing import List, Dict, Any
import openai
import os
import json
from langchain_community.chat_models import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from intelgraph_py.cache import generate_cache_key, get_cached_explanation, set_cached_explanation
from intelgraph_py.models import LLMSettings
from intelgraph_py.database import get_db
from sqlalchemy.orm import Session
from intelgraph_py.logger_config import logger

# Set your OpenAI API key
# It's recommended to load this from environment variables
openai.api_key = os.getenv("OPENAI_API_KEY")

class ExplanationOutput(BaseModel):
    explanation_text: str = Field(..., description="Natural language explanation of the insight.")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score of the explanation (0.0 to 1.0).")
    source_metadata: Dict[str, Any] = Field(..., description="Metadata of the source data used for explanation.")
    semantic_summary: str = Field(..., description="A concise semantic summary of the explanation.")

class PromptGenerator:
    @staticmethod
    def generate_prompt(insight_data: Dict[str, Any]) -> str:
        insight_type = insight_data.get("insight_type")
        prompt_parts = [
            "Generate a natural language explanation for the following AI-derived graph insight.",
            "The explanation should be clear, concise, and factually accurate.",
            "Provide a confidence score (0.0-1.0), reference source metadata, and a semantic summary.",
            "Return the output as a JSON object with keys: explanation_text, confidence_score, source_metadata, semantic_summary."
        ]

        if insight_type == "community_detection":
            prompt_parts.append("Insight Type: Community Detection")
            if insight_data.get("community_id") is not None:
                prompt_parts.append(f"- Community ID: {insight_data['community_id']}")
            if insight_data.get("nodes"): # Assuming nodes are part of this community
                prompt_parts.append(f"- Nodes in this insight: {', '.join(insight_data['nodes'])}")
            if insight_data.get("community_details"): # More detailed community info
                details = "; ".join([f"Node {d['node_id']} in community {d['community_id']}" for d in insight_data['community_details']])
                prompt_parts.append(f"- Community details: {details}")
            prompt_parts.append("Explain why these nodes form a community and what characterizes it.")
        elif insight_type == "centrality":
            prompt_parts.append("Insight Type: Centrality Analysis")
            if insight_data.get("central_node_id"):
                prompt_parts.append(f"- Central Node ID: {insight_data['central_node_id']}")
            if insight_data.get("centrality_score") is not None:
                prompt_parts.append(f"- Centrality Score: {insight_data['centrality_score']}")
            if insight_data.get("centrality_type"):
                prompt_parts.append(f"- Centrality Type: {insight_data['centrality_type']}")
            prompt_parts.append("Explain the significance of this node's centrality within the graph.")
        elif insight_type == "link_prediction":
            prompt_parts.append("Insight Type: Link Prediction")
            if insight_data.get("predicted_edge"):
                edge = insight_data["predicted_edge"]
                prompt_parts.append(f"- Predicted Edge: From {edge.get('source_node_id')} to {edge.get('target_node_id')}")
                prompt_parts.append(f"- Prediction Score: {edge.get('prediction_score')}")
            prompt_parts.append("Explain why this link is predicted to exist.")
        else:
            prompt_parts.append("Insight Data:")
            for key, value in insight_data.items():
                prompt_parts.append(f"- {key}: {value}")
            prompt_parts.append("Explain this general graph insight.")

        return "\n".join(prompt_parts)

class ExplanationOutput(BaseModel):
    explanation_text: str = Field(..., description="Natural language explanation of the insight.")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score of the explanation (0.0 to 1.0).")
    source_metadata: Dict[str, Any] = Field(..., description="Metadata of the source data used for explanation.")
    semantic_summary: str = Field(..., description="A concise semantic summary of the explanation.")

class PromptGenerator:
    @staticmethod
    def generate_prompt(insight_data: Dict[str, Any]) -> str:
        insight_type = insight_data.get("insight_type")
        prompt_parts = [
            "Generate a natural language explanation for the following AI-derived graph insight.",
            "The explanation should be clear, concise, and factually accurate.",
            "Provide a confidence score (0.0-1.0), reference source metadata, and a semantic summary.",
            "Return the output as a JSON object with keys: explanation_text, confidence_score, source_metadata, semantic_summary."
        ]

        if insight_type == "community_detection":
            prompt_parts.append("Insight Type: Community Detection")
            if insight_data.get("community_id") is not None:
                prompt_parts.append(f"- Community ID: {insight_data["community_id"]}")
            if insight_data.get("nodes"):
                prompt_parts.append(f"- Nodes in this insight: {', '.join(insight_data['nodes'])}")
            if insight_data.get("community_details"):
                details = "; ".join([f"Node {d['node_id']} in community {d['community_id']}" for d in insight_data['community_details']])
                prompt_parts.append(f"- Community details: {details}")
            prompt_parts.append("Explain why these nodes form a community and what characterizes it.")
        elif insight_type == "centrality":
            prompt_parts.append("Insight Type: Centrality Analysis")
            if insight_data.get("central_node_id"):
                prompt_parts.append(f"- Central Node ID: {insight_data["central_node_id"]}")
            if insight_data.get("centrality_score") is not None:
                prompt_parts.append(f"- Centrality Score: {insight_data["centrality_score"]}")
            if insight_data.get("centrality_type"):
                prompt_parts.append(f"- Centrality Type: {insight_data["centrality_type"]}")
            prompt_parts.append("Explain the significance of this node's centrality within the graph.")
        elif insight_type == "link_prediction":
            prompt_parts.append("Insight Type: Link Prediction")
            if insight_data.get("predicted_edge"):
                edge = insight_data["predicted_edge"]
                prompt_parts.append(f"- Predicted Edge: From {edge.get('source_node_id')} to {edge.get('target_node_id')}")
                prompt_parts.append(f"- Prediction Score: {edge.get('prediction_score')}")
            prompt_parts.append("Explain why this link is predicted to exist.")
        else:
            prompt_parts.append("Insight Data:")
            for key, value in insight_data.items():
                prompt_parts.append(f"- {key}: {value}")
            prompt_parts.append("Explain this general graph insight.")

        return "\n".join(prompt_parts)

async def generate_explanation(

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
    user_message_content = PromptGenerator.generate_prompt(insight_data)

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
            async def generate_explanation(
    insight_data: Dict[str, Any],
    llm_model: str = "gpt-4o"
) -> ExplanationOutput:
    """
    Generates a natural language explanation for AI-derived graph insights.

    Args:
        insight_data: A dictionary containing the AI insight data.
                      Expected keys: 'insight_type' (e.g., 'community_detection', 'centrality'),
                      'nodes' (list of node IDs), 'edges' (list of edge details),
                      'community_id' (for community insights), 'central_node_id' (for centrality insights), etc.
        llm_model: The LLM model to use for generation (e.g., "gpt-4o", "llama3").

    Returns:
        An ExplanationOutput object containing the explanation, confidence, metadata, and summary.
    """
    db: Session = next(get_db())
    llm_config = db.query(LLMSettings).filter(LLMSettings.model_name == llm_model, LLMSettings.is_active == True).first()
    db.close()

    if not llm_config:
        raise ValueError(f"LLM configuration for model '{llm_model}' not found or not active.")

    temperature = llm_config.temperature
    max_tokens = llm_config.max_tokens
    api_key = llm_config.api_key
    base_url = llm_config.base_url

    # Override global OpenAI API key if specific to this model
    if llm_config.provider == "openai" and api_key:
        openai.api_key = api_key
    elif llm_config.provider == "ollama" and base_url:
        os.environ["OLLAMA_BASE_URL"] = base_url

    cache_key = generate_cache_key(insight_data, llm_model)
    cached_explanation = get_cached_explanation(cache_key)
    if cached_explanation:
        return ExplanationOutput(**cached_explanation)

    system_message = "You are an expert graph analyst and AI explainability engine. Your task is to explain complex graph insights in an understandable manner."
    user_message_content = PromptGenerator.generate_prompt(insight_data)

    try:
        if llm_config.provider == "openai":
            if not openai.api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set or not provided in LLM settings.")
            response = await openai.ChatCompletion.acreate(
                model=llm_config.model_name,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message_content}
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"}
            )
            llm_output = response.choices[0].message.content
        elif llm_config.provider == "ollama":
            llm = ChatOllama(model=llm_config.model_name, temperature=temperature, num_predict=max_tokens)
            messages = [
                SystemMessage(content=system_message),
                HumanMessage(content=user_message_content)
            ]
            response = await llm.ainvoke(messages)
            llm_output = response.content
        else:
            raise ValueError(f"Unsupported LLM provider: {llm_config.provider}")

        parsed_output = json.loads(llm_output)

        explanation_output = ExplanationOutput(
            explanation_text=parsed_output.get("explanation_text", ""),
            confidence_score=parsed_output.get("confidence_score", 0.0),
            source_metadata=parsed_output.get("source_metadata", {}),
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

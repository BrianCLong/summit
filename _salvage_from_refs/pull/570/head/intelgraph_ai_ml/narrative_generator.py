import hashlib
import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

try:
    from intelgraph_postgres_client import IntelGraphPostgresClient
except Exception:  # pragma: no cover - optional dependency
    IntelGraphPostgresClient = None

logger = logging.getLogger(__name__)


@dataclass
class Event:
    """Simple event representation extracted from the graph."""

    timestamp: datetime
    actor: str
    action: str
    target: Optional[str] = None
    tags: Optional[List[str]] = None
    confidence: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


def _mask_sensitive(text: str, sensitive: List[str]) -> Tuple[str, Dict[str, str]]:
    """Mask sensitive entity names with placeholders."""
    mapping = {}
    for i, entity in enumerate(sensitive, 1):
        placeholder = f"[ENTITY_{i}]"
        mapping[placeholder] = entity
        text = text.replace(entity, placeholder)
    return text, mapping


def _unmask_sensitive(text: str, mapping: Dict[str, str]) -> str:
    """Reinsert masked entities into text."""
    for placeholder, entity in mapping.items():
        text = text.replace(placeholder, entity)
    return text


def traverse_graph(graph: Dict[str, Any], tags: Optional[List[str]] = None) -> List[Event]:
    """Traverse a graph dictionary and extract time ordered events."""
    nodes = {n["id"]: n for n in graph.get("nodes", [])}
    events: List[Event] = []
    for edge in graph.get("edges", []):
        if tags and not set(tags).intersection(edge.get("tags", [])):
            continue
        src = nodes.get(edge.get("source"), {})
        tgt = nodes.get(edge.get("target"), {})
        ts = edge.get("timestamp")
        ts_dt = datetime.fromisoformat(ts) if isinstance(ts, str) else ts
        events.append(
            Event(
                timestamp=ts_dt,
                actor=src.get("label", "unknown"),
                action=edge.get("type", "related"),
                target=tgt.get("label"),
                tags=edge.get("tags"),
                confidence=edge.get("confidence"),
                metadata=edge.get("metadata"),
            )
        )
    events.sort(key=lambda e: e.timestamp)
    return events


def format_prompt(events: List[Event], tone: str = "analyst") -> str:
    """Create prompt template for the LLM."""
    header = (
        f"You are an {tone} preparing a structured intelligence report. "
        "Provide an executive summary, a detailed timeline narrative, and highlighted insights including Notable Behaviors, "
        "Suspicious Links, and Data Exfil Points."
    )
    body_lines = []
    for ev in events:
        ts = ev.timestamp.isoformat()
        actor = ev.actor
        action = ev.action
        target = f" -> {ev.target}" if ev.target else ""
        tags = f" tags={','.join(ev.tags)}" if ev.tags else ""
        conf = f" conf={ev.confidence}" if ev.confidence is not None else ""
        body_lines.append(f"- {ts}: {actor} {action}{target}{tags}{conf}")
    body = "\n".join(body_lines)
    return f"{header}\nEvents:\n{body}\n"


def _call_llm(prompt: str, provider: str = "openai", model: str = "gpt-4o") -> Dict[str, Any]:
    """Call the configured LLM provider. If no API key is present, returns a stub response."""
    api_key = None
    if provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
    elif provider == "anthropic":
        api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("No API key found for provider %s; returning stub output", provider)
        return {
            "executive_summary": "Stubbed executive summary.",
            "timeline": "Stubbed timeline narrative.",
            "insights": {
                "Notable Behaviors": [],
                "Suspicious Links": [],
                "Data Exfil Points": [],
            },
        }
    try:
        import requests

        if provider == "openai":
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {api_key}"}
            data = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
            }
            res = requests.post(url, headers=headers, json=data, timeout=30)
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
        else:
            url = "https://api.anthropic.com/v1/messages"
            headers = {
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            }
            data = {
                "model": model,
                "max_tokens": 1000,
                "messages": [{"role": "user", "content": prompt}],
            }
            res = requests.post(url, headers=headers, json=data, timeout=30)
            res.raise_for_status()
            content = res.json()["content"][0]["text"]
        # naive parsing expecting JSON-like sections
        return json.loads(content)
    except Exception as exc:  # pragma: no cover - network failure
        logger.error("LLM call failed: %s", exc)
        return {
            "executive_summary": "LLM call failed.",
            "timeline": "",
            "insights": {},
        }


def generate_narrative(
    graph: Dict[str, Any],
    tags: Optional[List[str]] = None,
    tone: str = "analyst",
    provider: str = "openai",
    model: str = "gpt-4o",
    sensitive_entities: Optional[List[str]] = None,
    pg_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """High level pipeline: extract events, build prompt, call LLM, log output."""
    events = traverse_graph(graph, tags=tags)
    prompt = format_prompt(events, tone=tone)
    masked_prompt, mapping = _mask_sensitive(prompt, sensitive_entities or [])
    prompt_hash = hashlib.sha256(masked_prompt.encode("utf-8")).hexdigest()
    logger.debug("Prompt hash %s", prompt_hash)

    response = _call_llm(masked_prompt, provider=provider, model=model)
    raw_output = json.dumps(response)
    output_hash = hashlib.sha256(raw_output.encode("utf-8")).hexdigest()

    # audit logging
    if pg_config and IntelGraphPostgresClient:
        try:
            client = IntelGraphPostgresClient(pg_config)
            client.log_processing_event(
                event_type="NARRATIVE_GENERATED",
                narrative_id=output_hash,
                message="narrative generated",
                metadata={"prompt_hash": prompt_hash},
            )
            client.close()
        except Exception as exc:  # pragma: no cover - DB optional
            logger.error("Failed to log to Postgres: %s", exc)
    elif pg_config:
        logger.warning("IntelGraphPostgresClient not available; skipping logging")

    # unmask sensitive info
    for key, val in response.items():
        if isinstance(val, str):
            response[key] = _unmask_sensitive(val, mapping)
        elif isinstance(val, dict):
            response[key] = {
                subk: _unmask_sensitive(subv, mapping) if isinstance(subv, str) else subv
                for subk, subv in val.items()
            }

    return {
        "narrative": response,
        "prompt_hash": prompt_hash,
        "output_hash": output_hash,
    }


def store_feedback(
    narrative_hash: str, rating: str, pg_config: Optional[Dict[str, Any]] = None
) -> None:
    """Record analyst feedback for a narrative."""
    if rating not in {"accurate", "needs_edit", "misleading"}:
        raise ValueError("Invalid rating")
    if not pg_config or not IntelGraphPostgresClient:
        logger.warning("Postgres logging unavailable; feedback not persisted")
        return
    client = IntelGraphPostgresClient(pg_config)
    client.log_processing_event(
        event_type="NARRATIVE_FEEDBACK", narrative_id=narrative_hash, message=rating
    )
    client.close()

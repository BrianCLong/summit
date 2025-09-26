"""NL → Cypher/GraphQL processor backed by LangChain utilities."""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

try:  # pragma: no cover - optional dependency
    from langchain.prompts import PromptTemplate  # type: ignore

    LANGCHAIN_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency
    PromptTemplate = None  # type: ignore
    LANGCHAIN_AVAILABLE = False

_SANITIZE_RE = re.compile(r"[^a-zA-Z0-9\s,\.\-_'?]")


@dataclass
class NLQueryResult:
    """Result returned by :class:`NaturalLanguageGraphProcessor`."""

    cypher: str
    params: Dict[str, Any]
    graphql: Optional[str] = None
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Return a JSON-serialisable dictionary representation."""

        return asdict(self)


class NaturalLanguageGraphProcessor:
    """Translate natural language prompts into graph queries.

    The processor optionally uses LangChain's :class:`PromptTemplate` for light
    normalisation of prompts. When LangChain is not present the implementation
    gracefully falls back to deterministic heuristics so the system remains
    deployable in minimal environments.
    """

    def __init__(self, default_limit: int = 25, max_limit: int = 100) -> None:
        self.default_limit = default_limit
        self.max_limit = max_limit
        self._prompt_template = (
            PromptTemplate(
                input_variables=["question"],
                template=(
                    "You are a classifier that decides which graph entity type a "
                    "question is about. Options: PERSON, ORGANIZATION, RELATIONSHIP, "
                    "GENERIC. Question: {question}"
                ),
            )
            if LANGCHAIN_AVAILABLE
            else None
        )

    # Public API -----------------------------------------------------------------
    def translate(
        self, prompt: str, tenant_id: str, *, limit: Optional[int] = None
    ) -> NLQueryResult:
        """Translate the provided prompt into executable queries."""

        sanitized = self._sanitize_prompt(prompt)
        if not sanitized:
            raise ValueError("Prompt is empty after sanitization")

        limit_value = self._normalise_limit(limit)
        intent = self._detect_intent(sanitized)
        params: Dict[str, Any] = {
            "tenantId": tenant_id,
            "limit": limit_value,
        }

        search_term = self._extract_search_term(sanitized)
        if search_term:
            params["searchTerm"] = search_term

        cypher = self._build_cypher(intent, search_term)
        graphql = self._build_graphql(intent, search_term)
        warnings: List[str] = []
        if sanitized != prompt.strip():
            warnings.append(
                "The prompt contained unsupported characters and was sanitized before processing."
            )

        logger.debug(
            "NLQ translation complete", extra={"intent": intent, "prompt": sanitized}
        )
        return NLQueryResult(cypher=cypher, params=params, graphql=graphql, warnings=warnings)

    # Helpers --------------------------------------------------------------------
    def _sanitize_prompt(self, prompt: str) -> str:
        prompt = prompt or ""
        cleaned = _SANITIZE_RE.sub(" ", prompt)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        # Bound the prompt to a sensible length for downstream systems.
        return cleaned[:512]

    def _normalise_limit(self, limit: Optional[int]) -> int:
        if limit is None:
            return self.default_limit
        try:
            value = int(limit)
        except (TypeError, ValueError):
            return self.default_limit
        return max(1, min(value, self.max_limit))

    def _detect_intent(self, sanitized_prompt: str) -> str:
        baseline = sanitized_prompt.lower()
        prompt_context = (
            self._prompt_template.format(question=sanitized_prompt)
            if self._prompt_template is not None
            else sanitized_prompt
        ).lower()

        if any(token in baseline for token in ["relationship", "connection", "connect"]):
            return "relationship"
        if any(token in baseline for token in ["person", "people", "individual", "user"]):
            return "person"
        if any(token in baseline for token in ["organization", "organisation", "company", "vendor"]):
            return "organization"
        if "relationship" in prompt_context:
            return "relationship"
        if "person" in prompt_context or "people" in prompt_context:
            return "person"
        if "organization" in prompt_context or "company" in prompt_context:
            return "organization"
        return "generic"

    def _extract_search_term(self, sanitized_prompt: str) -> Optional[str]:
        match = re.search(
            r"(?:named|called|with name|about) ([a-zA-Z0-9\-\s]{2,80})",
            sanitized_prompt,
            re.IGNORECASE,
        )
        if match:
            value = match.group(1).strip()
            return re.sub(r"\s+", " ", value)[:80]
        return None

    def _build_cypher(self, intent: str, search_term: Optional[str]) -> str:
        base_match = {
            "person": "MATCH (node:Person)",
            "organization": "MATCH (node:Organization)",
            "relationship": "MATCH (src)-[rel]->(dst)",
        }.get(intent, "MATCH (node)")

        where_clauses = ["node.tenantId = $tenantId"]
        if intent == "relationship":
            where_clauses = ["rel.tenantId = $tenantId"]
        if search_term and intent != "relationship":
            where_clauses.append("toLower(node.name) CONTAINS toLower($searchTerm)")

        where_clause = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        if intent == "relationship":
            return (
                "MATCH (src)-[rel]->(dst) "
                + where_clause
                + " RETURN src AS source, rel AS relationship, dst AS target LIMIT $limit"
            )
        return f"{base_match}{where_clause} RETURN node LIMIT $limit"

    def _build_graphql(self, intent: str, search_term: Optional[str]) -> str:
        if intent == "relationship":
            return (
                "query RelationshipSearch($tenantId: String!, $limit: Int!) {\n"
                "  relationships(input: { tenantId: $tenantId, limit: $limit }) {\n"
                "    id\n    type\n    srcId\n    dstId\n  }\n}"
            )
        filter_part = (
            "kind: \"Person\", "
            if intent == "person"
            else "kind: \"Organization\", " if intent == "organization" else ""
        )
        search_fragment = (
            "props: { name: $searchTerm }, "
            if search_term and intent != "relationship"
            else ""
        )
        return (
            "query EntitySearch($tenantId: String!, $limit: Int!, $searchTerm: String) {\n"
            "  entities(input: { tenantId: $tenantId, "
            + filter_part
            + search_fragment
            + "limit: $limit }) {\n    id\n    kind\n    labels\n    props\n  }\n}"
        )

    # Serialisation helpers ------------------------------------------------------
    def to_json(self, result: NLQueryResult) -> str:
        """Return a JSON string representation of ``result``."""

        return json.dumps(result.to_dict())


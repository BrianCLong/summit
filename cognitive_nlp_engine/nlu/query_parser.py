"""Natural Language Understanding for Security Query Parsing."""

import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any


@dataclass
class ParsedQuery:
    """Parsed representation of a natural language security query."""

    original_text: str
    intent: str
    entities: dict[str, list[str]]
    temporal_context: dict[str, Any]
    constraints: list[dict[str, Any]]
    confidence: float
    parsed_at: str


@dataclass
class Entity:
    """Extracted entity from query."""

    text: str
    type: str
    start_pos: int
    end_pos: int
    confidence: float


class SecurityQueryParser:
    """Parse natural language security queries into structured representations."""

    def __init__(self):
        """Initialize the query parser with security domain knowledge."""
        self.intents = {
            "find_threats": ["find", "detect", "identify", "locate", "search"],
            "analyze_behavior": ["analyze", "examine", "review", "study", "investigate"],
            "predict_risk": ["predict", "forecast", "anticipate", "estimate"],
            "explain_incident": ["explain", "why", "how", "reason", "cause"],
            "compare_scenarios": ["compare", "contrast", "difference", "similar"],
            "generate_hypothesis": ["hypothesize", "theorize", "propose", "suggest"],
            "validate_evidence": ["validate", "verify", "confirm", "prove"],
            "simulate_scenario": ["simulate", "model", "what if", "counterfactual"],
        }

        self.entity_types = {
            "ip_address": r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b",
            "domain": r"\b[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+\b",
            "hash": r"\b[a-fA-F0-9]{32}|[a-fA-F0-9]{40}|[a-fA-F0-9]{64}\b",
            "user": r"\b(user|account|principal):\s*([^\s,]+)\b",
            "system": r"\b(server|host|machine|system):\s*([^\s,]+)\b",
            "time_reference": r"\b(yesterday|today|tomorrow|last\s+week|this\s+month|recent|past|future)\b",
            "severity": r"\b(low|medium|high|critical|urgent|important)\b",
        }

        self.temporal_patterns = {
            "relative_time": r"\b(last|past|previous)\s+(\d+)\s+(minutes?|hours?|days?|weeks?|months?)\b",
            "specific_time": r"\b(on|at|during)\s+([^.!?]+?)(?=\s+(and|or|but|\.))",
            "time_range": r"\b(from\s+.+?\s+to\s+.+?|between\s+.+?\s+and\s+.+)\b",
        }

    def parse_query(self, query_text: str) -> ParsedQuery:
        """Parse a natural language query into structured components."""
        # Extract intent
        intent = self._extract_intent(query_text)

        # Extract entities
        entities = self._extract_entities(query_text)

        # Extract temporal context
        temporal_context = self._extract_temporal_context(query_text)

        # Extract constraints
        constraints = self._extract_constraints(query_text)

        # Calculate confidence based on parsing completeness
        confidence = self._calculate_confidence(intent, entities, temporal_context)

        return ParsedQuery(
            original_text=query_text,
            intent=intent,
            entities=entities,
            temporal_context=temporal_context,
            constraints=constraints,
            confidence=confidence,
            parsed_at=datetime.utcnow().isoformat(),
        )

    def _extract_intent(self, query_text: str) -> str:
        """Extract the primary intent from the query."""
        query_lower = query_text.lower()

        # Score each intent based on keyword matches
        intent_scores = {}
        for intent, keywords in self.intents.items():
            score = sum(1 for keyword in keywords if keyword in query_lower)
            intent_scores[intent] = score

        # Return the intent with highest score, default to find_threats
        if intent_scores:
            return max(intent_scores, key=intent_scores.get)
        return "find_threats"

    def _extract_entities(self, query_text: str) -> dict[str, list[str]]:
        """Extract named entities from the query."""
        entities: dict[str, list[str]] = {}

        # Extract entities using regex patterns
        for entity_type, pattern in self.entity_types.items():
            matches = re.finditer(pattern, query_text, re.IGNORECASE)
            entity_values = []
            for match in matches:
                if entity_type in ["user", "system"] and match.groups():
                    # Handle grouped matches for user and system entities
                    entity_values.append(match.group(2))
                else:
                    entity_values.append(match.group(0))

            if entity_values:
                entities[entity_type] = entity_values

        return entities

    def _extract_temporal_context(self, query_text: str) -> dict[str, Any]:
        """Extract temporal context from the query."""
        temporal_context = {}

        # Check for relative time references
        relative_match = re.search(
            self.temporal_patterns["relative_time"], query_text, re.IGNORECASE
        )
        if relative_match:
            quantity = int(relative_match.group(2))
            unit = relative_match.group(3).rstrip("s")  # Remove plural 's'
            temporal_context["relative"] = {
                "quantity": quantity,
                "unit": unit,
                "start_time": self._calculate_relative_time(quantity, unit),
            }

        # Check for specific time references
        specific_matches = re.findall(
            self.temporal_patterns["specific_time"], query_text, re.IGNORECASE
        )
        if specific_matches:
            temporal_context["specific_times"] = [match[1] for match in specific_matches]

        # Check for time ranges
        range_match = re.search(self.temporal_patterns["time_range"], query_text, re.IGNORECASE)
        if range_match:
            temporal_context["time_range"] = range_match.group(0)

        return temporal_context

    def _extract_constraints(self, query_text: str) -> list[dict[str, Any]]:
        """Extract constraints and filters from the query."""
        constraints = []

        # Extract severity constraints
        severity_match = re.search(
            r"(severity|criticality|importance):\s*(low|medium|high|critical)",
            query_text,
            re.IGNORECASE,
        )
        if severity_match:
            constraints.append(
                {
                    "type": "severity",
                    "operator": "=",
                    "value": severity_match.group(2).upper(),
                    "confidence": 0.9,
                }
            )

        # Extract status constraints
        status_match = re.search(
            r"(status):\s*(active|closed|resolved|investigating)", query_text, re.IGNORECASE
        )
        if status_match:
            constraints.append(
                {
                    "type": "status",
                    "operator": "=",
                    "value": status_match.group(2).upper(),
                    "confidence": 0.9,
                }
            )

        # Extract categorical constraints (e.g., threat type, category)
        category_match = re.search(
            r"(threat|category|type):\s*([a-zA-Z\s]+)", query_text, re.IGNORECASE
        )
        if category_match:
            constraints.append(
                {
                    "type": "category",
                    "operator": "LIKE",
                    "value": category_match.group(2).strip(),
                    "confidence": 0.8,
                }
            )

        return constraints

    def _calculate_relative_time(self, quantity: int, unit: str) -> str:
        """Calculate the start time for relative time references."""
        now = datetime.utcnow()

        if unit == "minute":
            delta = timedelta(minutes=quantity)
        elif unit == "hour":
            delta = timedelta(hours=quantity)
        elif unit == "day":
            delta = timedelta(days=quantity)
        elif unit == "week":
            delta = timedelta(weeks=quantity)
        elif unit == "month":
            # Approximate month as 30 days
            delta = timedelta(days=30 * quantity)
        else:
            delta = timedelta()

        start_time = now - delta
        return start_time.isoformat()

    def _calculate_confidence(
        self, intent: str, entities: dict[str, list[str]], temporal_context: dict[str, Any]
    ) -> float:
        """Calculate confidence score based on parsing completeness."""
        # Base confidence
        confidence = 0.5

        # Increase for detected intent
        if intent:
            confidence += 0.2

        # Increase for detected entities
        if entities:
            confidence += min(0.2 * len(entities), 0.3)

        # Increase for temporal context
        if temporal_context:
            confidence += 0.1

        return min(confidence, 1.0)


# Global instance
query_parser = SecurityQueryParser()

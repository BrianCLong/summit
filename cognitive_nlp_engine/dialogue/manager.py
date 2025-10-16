"""Dialogue Management for Context-Aware Conversations."""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class DialogueTurn:
    """Represents a single turn in a dialogue."""

    turn_id: str
    user_input: str
    system_response: str
    parsed_query: dict[str, Any] | None
    context_updates: dict[str, Any]
    timestamp: str
    confidence: float


@dataclass
class DialogueContext:
    """Maintains context across dialogue turns."""

    conversation_id: str
    user_id: str
    created_at: str
    last_updated: str
    current_topic: str = "general"
    entities: dict[str, list[str]] = field(default_factory=dict)
    temporal_scope: dict[str, Any] = field(default_factory=dict)
    investigation_context: str | None = None
    session_variables: dict[str, Any] = field(default_factory=dict)
    conversation_history: list[DialogueTurn] = field(default_factory=list)
    active_goals: list[dict[str, Any]] = field(default_factory=list)


class DialogueManager:
    """Manage multi-turn dialogues with context preservation."""

    def __init__(self):
        """Initialize the dialogue manager."""
        self.active_dialogues: dict[str, DialogueContext] = {}
        self.max_history_turns = 20

    def start_dialogue(self, user_id: str, initial_context: dict[str, Any] | None = None) -> str:
        """Start a new dialogue session."""
        conversation_id = str(uuid.uuid4())
        context = DialogueContext(
            conversation_id=conversation_id,
            user_id=user_id,
            created_at=datetime.utcnow().isoformat(),
            last_updated=datetime.utcnow().isoformat(),
            session_variables=initial_context or {},
        )

        self.active_dialogues[conversation_id] = context
        return conversation_id

    def process_turn(
        self, conversation_id: str, user_input: str, parsed_query: dict[str, Any] | None = None
    ) -> DialogueTurn:
        """Process a dialogue turn and maintain context."""
        if conversation_id not in self.active_dialogues:
            raise ValueError(f"No active dialogue found for ID: {conversation_id}")

        context = self.active_dialogues[conversation_id]

        # Update context with new information
        context_updates = self._update_context(context, user_input, parsed_query)

        # Create dialogue turn
        turn = DialogueTurn(
            turn_id=str(uuid.uuid4()),
            user_input=user_input,
            system_response="",  # Will be filled by response generator
            parsed_query=parsed_query,
            context_updates=context_updates,
            timestamp=datetime.utcnow().isoformat(),
            confidence=parsed_query.get("confidence", 0.5) if parsed_query else 0.5,
        )

        # Add to conversation history
        context.conversation_history.append(turn)

        # Trim history if too long
        if len(context.conversation_history) > self.max_history_turns:
            context.conversation_history = context.conversation_history[-self.max_history_turns :]

        # Update last modified time
        context.last_updated = datetime.utcnow().isoformat()

        return turn

    def _update_context(
        self, context: DialogueContext, user_input: str, parsed_query: dict[str, Any] | None
    ) -> dict[str, Any]:
        """Update dialogue context with new information."""
        updates = {}

        if parsed_query:
            # Update entities
            if "entities" in parsed_query:
                for entity_type, entity_values in parsed_query["entities"].items():
                    if entity_type not in context.entities:
                        context.entities[entity_type] = []
                    # Add new entities, avoiding duplicates
                    for value in entity_values:
                        if value not in context.entities[entity_type]:
                            context.entities[entity_type].append(value)
                    updates[f"entities_{entity_type}"] = entity_values

            # Update temporal context
            if "temporal_context" in parsed_query:
                context.temporal_scope.update(parsed_query["temporal_context"])
                updates["temporal_context"] = parsed_query["temporal_context"]

            # Update topic if changed
            if "intent" in parsed_query:
                new_topic = self._map_intent_to_topic(parsed_query["intent"])
                if new_topic != context.current_topic:
                    context.current_topic = new_topic
                    updates["topic"] = new_topic

        return updates

    def _map_intent_to_topic(self, intent: str) -> str:
        """Map intent to dialogue topic."""
        topic_mapping = {
            "find_threats": "threat_hunting",
            "analyze_behavior": "behavior_analysis",
            "predict_risk": "risk_assessment",
            "explain_incident": "incident_investigation",
            "compare_scenarios": "scenario_analysis",
            "generate_hypothesis": "hypothesis_generation",
            "validate_evidence": "evidence_validation",
            "simulate_scenario": "counterfactual_simulation",
        }
        return topic_mapping.get(intent, "general")

    def get_context(self, conversation_id: str) -> DialogueContext | None:
        """Retrieve dialogue context."""
        return self.active_dialogues.get(conversation_id)

    def update_investigation_context(self, conversation_id: str, investigation_id: str) -> None:
        """Associate dialogue with specific investigation."""
        if conversation_id in self.active_dialogues:
            context = self.active_dialogues[conversation_id]
            context.investigation_context = investigation_id
            context.last_updated = datetime.utcnow().isoformat()

    def set_session_variable(self, conversation_id: str, key: str, value: Any) -> None:
        """Set a session variable."""
        if conversation_id in self.active_dialogues:
            context = self.active_dialogues[conversation_id]
            context.session_variables[key] = value
            context.last_updated = datetime.utcnow().isoformat()

    def get_session_variable(self, conversation_id: str, key: str) -> Any | None:
        """Get a session variable."""
        if conversation_id in self.active_dialogues:
            context = self.active_dialogues[conversation_id]
            return context.session_variables.get(key)
        return None

    def end_dialogue(self, conversation_id: str) -> DialogueContext | None:
        """End a dialogue session and return final context."""
        if conversation_id in self.active_dialogues:
            context = self.active_dialogues.pop(conversation_id)
            return context
        return None

    def get_active_conversations(self, user_id: str) -> list[dict[str, Any]]:
        """Get all active conversations for a user."""
        conversations = []
        for conv_id, context in self.active_dialogues.items():
            if context.user_id == user_id:
                conversations.append(
                    {
                        "conversation_id": conv_id,
                        "created_at": context.created_at,
                        "last_updated": context.last_updated,
                        "current_topic": context.current_topic,
                        "turn_count": len(context.conversation_history),
                    }
                )
        return conversations


# Global instance
dialogue_manager = DialogueManager()

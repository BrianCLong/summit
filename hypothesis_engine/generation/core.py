"""Enhanced Hypothesis Generation Engine for Security Investigations."""

import hashlib
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class Hypothesis:
    """Represents an investigative hypothesis."""

    id: str
    title: str
    description: str
    explanation: str
    type: str  # 'causal', 'correlation', 'predictive', 'counterfactual'
    confidence: float  # 0.0 - 1.0
    priority: int  # 1-5, higher is more important
    supporting_evidence: list[str] = field(default_factory=list)
    contradicting_evidence: list[str] = field(default_factory=list)
    required_evidence: list[str] = field(default_factory=list)
    related_entities: list[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    status: str = "proposed"  # proposed, validated, rejected, archived
    validation_score: float | None = None
    validation_details: dict[str, Any] = field(default_factory=dict)


@dataclass
class EvidenceRequirement:
    """Represents required evidence to validate a hypothesis."""

    id: str
    description: str
    type: str  # 'log', 'network', 'file', 'memory', 'testimony', 'document'
    source: str  # Where to find this evidence
    priority: int  # 1-5, higher is more critical
    estimated_effort: str  # low, medium, high
    status: str = "needed"  # needed, collected, analyzed
    collected_at: str | None = None
    collected_by: str | None = None


@dataclass
class Observation:
    """Represents an observation that can lead to hypothesis generation."""

    id: str
    description: str
    type: str  # 'anomaly', 'ioc', 'behavior', 'event', 'finding'
    confidence: float  # 0.0 - 1.0
    source: str
    timestamp: str
    related_entities: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class HypothesisGenerator:
    """Generates investigative hypotheses from security observations."""

    def __init__(self):
        """Initialize the hypothesis generator."""
        self.pattern_templates = self._initialize_pattern_templates()
        self.novelty_threshold = 0.7  # Minimum novelty score for novel hypotheses
        self.diversity_threshold = 0.5  # Minimum diversity between hypotheses

    def _initialize_pattern_templates(self) -> dict[str, dict[str, Any]]:
        """Initialize hypothesis generation templates based on common security patterns."""
        return {
            "lateral_movement": {
                "title_template": "Unauthorized Lateral Movement via {method}",
                "description_template": "Suspect unauthorized movement across network using {method} from {source_entity} to {target_entity}",
                "explanation_template": "Detected anomalous {method} connections that deviate from established patterns, suggesting potential compromise propagation",
                "required_evidence": [
                    "Network connection logs showing {method} traffic",
                    "Authentication logs for {source_entity}",
                    "System logs on {target_entity}",
                    "Process execution logs on intermediate hosts",
                ],
            },
            "data_exfiltration": {
                "title_template": "Potential Data Exfiltration via {channel}",
                "description_template": "Identified suspicious data transfer patterns using {channel} that may indicate data theft",
                "explanation_template": "Observed anomalous outbound {channel} traffic volumes exceeding baseline norms by {deviation_percent}%",
                "required_evidence": [
                    "Network flow data for {channel} traffic",
                    "Data loss prevention alerts",
                    "File access logs for sensitive directories",
                    "DNS query logs for unusual domains",
                ],
            },
            "privilege_escalation": {
                "title_template": "Possible Privilege Escalation via {method}",
                "description_template": "Detected suspicious privilege escalation attempts using {method} on {target_system}",
                "explanation_template": "Unusual privilege acquisition patterns that bypass normal access controls on {target_system}",
                "required_evidence": [
                    "System logs showing {method} usage",
                    "Privilege change audit logs",
                    "Process execution with elevated privileges",
                    "Security event logs for access control changes",
                ],
            },
            "persistence_mechanism": {
                "title_template": "Persistence Mechanism via {technique}",
                "description_template": "Identified potential persistence mechanism using {technique} on {affected_system}",
                "explanation_template": "Suspicious {technique} artifacts found that would allow continued access after reboot",
                "required_evidence": [
                    "Registry modification logs for {technique}",
                    "Scheduled task creation logs",
                    "Startup folder modifications",
                    "Service installation events",
                ],
            },
            "command_control": {
                "title_template": "Command and Control Activity via {protocol}",
                "description_template": "Detected potential C2 communications using {protocol} from {infected_host}",
                "explanation_template": "Anomalous {protocol} traffic patterns that match known C2 signatures",
                "required_evidence": [
                    "Network traffic captures showing {protocol} beaconing",
                    "DNS query logs for suspicious domains",
                    "HTTP request logs with unusual User-Agent strings",
                    "Firewall logs for outbound {protocol} connections",
                ],
            },
        }

    def generate_from_observations(self, observations: list[Observation]) -> list[Hypothesis]:
        """Generate hypotheses from a list of security observations."""
        hypotheses = []
        processed_hashes = set()  # Track already generated hypotheses to avoid duplicates

        for observation in observations:
            # Generate hypotheses based on observation type
            observation_hypotheses = self._generate_observation_hypotheses(observation)

            # Filter for novelty and diversity
            for hypothesis in observation_hypotheses:
                hypothesis_hash = self._calculate_hypothesis_hash(hypothesis)

                if hypothesis_hash not in processed_hashes:
                    # Check diversity against existing hypotheses
                    if self._is_diverse(hypothesis, hypotheses):
                        hypotheses.append(hypothesis)
                        processed_hashes.add(hypothesis_hash)

        # Sort by confidence and priority
        hypotheses.sort(key=lambda h: (h.confidence, h.priority), reverse=True)

        logger.info(f"Generated {len(hypotheses)} hypotheses from {len(observations)} observations")
        return hypotheses

    def _generate_observation_hypotheses(self, observation: Observation) -> list[Hypothesis]:
        """Generate hypotheses specific to a single observation."""
        hypotheses = []

        # Extract entities from observation
        entities = observation.related_entities or []

        # Generate hypotheses based on observation type
        if observation.type == "anomaly":
            hypotheses.extend(self._generate_anomaly_hypotheses(observation, entities))
        elif observation.type == "ioc":
            hypotheses.extend(self._generate_ioc_hypotheses(observation, entities))
        elif observation.type == "behavior":
            hypotheses.extend(self._generate_behavior_hypotheses(observation, entities))
        elif observation.type == "event":
            hypotheses.extend(self._generate_event_hypotheses(observation, entities))
        elif observation.type == "finding":
            hypotheses.extend(self._generate_finding_hypotheses(observation, entities))

        return hypotheses

    def _generate_anomaly_hypotheses(
        self, observation: Observation, entities: list[str]
    ) -> list[Hypothesis]:
        """Generate hypotheses from anomaly observations."""
        hypotheses = []

        # Pattern 1: Lateral movement hypothesis
        if (
            "network" in observation.description.lower()
            or "connection" in observation.description.lower()
        ):
            hypothesis = self._create_hypothesis(
                pattern_type="lateral_movement",
                observation=observation,
                entities=entities,
                method="network connections",
                source_entity=entities[0] if entities else "unknown host",
                target_entity=entities[1] if len(entities) > 1 else "other systems",
            )
            if hypothesis:
                hypotheses.append(hypothesis)

        # Pattern 2: Data exfiltration hypothesis
        if (
            "large" in observation.description.lower()
            or "volume" in observation.description.lower()
        ):
            hypothesis = self._create_hypothesis(
                pattern_type="data_exfiltration",
                observation=observation,
                entities=entities,
                channel="network channels",
                deviation_percent="significant",
            )
            if hypothesis:
                hypotheses.append(hypothesis)

        return hypotheses

    def _generate_ioc_hypotheses(
        self, observation: Observation, entities: list[str]
    ) -> list[Hypothesis]:
        """Generate hypotheses from IOC observations."""
        hypotheses = []

        # Pattern: Command and control hypothesis
        if (
            "ip" in observation.metadata.get("ioc_type", "").lower()
            or "domain" in observation.metadata.get("ioc_type", "").lower()
        ):
            hypothesis = self._create_hypothesis(
                pattern_type="command_control",
                observation=observation,
                entities=entities,
                protocol="encrypted protocols",
                infected_host=entities[0] if entities else "compromised system",
            )
            if hypothesis:
                hypotheses.append(hypothesis)

        return hypotheses

    def _generate_behavior_hypotheses(
        self, observation: Observation, entities: list[str]
    ) -> list[Hypothesis]:
        """Generate hypotheses from behavioral observations."""
        hypotheses = []

        # Pattern: Persistence mechanism hypothesis
        if (
            "startup" in observation.description.lower()
            or "scheduled" in observation.description.lower()
        ):
            hypothesis = self._create_hypothesis(
                pattern_type="persistence_mechanism",
                observation=observation,
                entities=entities,
                technique="registry modifications",
                affected_system=entities[0] if entities else "target system",
            )
            if hypothesis:
                hypotheses.append(hypothesis)

        # Pattern: Privilege escalation hypothesis
        if "admin" in observation.description.lower() or "root" in observation.description.lower():
            hypothesis = self._create_hypothesis(
                pattern_type="privilege_escalation",
                observation=observation,
                entities=entities,
                method="privilege escalation techniques",
                target_system=entities[0] if entities else "privileged system",
            )
            if hypothesis:
                hypotheses.append(hypothesis)

        return hypotheses

    def _generate_event_hypotheses(
        self, observation: Observation, entities: list[str]
    ) -> list[Hypothesis]:
        """Generate hypotheses from event observations."""
        return []  # Placeholder for future implementation

    def _generate_finding_hypotheses(
        self, observation: Observation, entities: list[str]
    ) -> list[Hypothesis]:
        """Generate hypotheses from finding observations."""
        return []  # Placeholder for future implementation

    def _create_hypothesis(
        self, pattern_type: str, observation: Observation, entities: list[str], **kwargs
    ) -> Hypothesis | None:
        """Create a hypothesis from a pattern template."""
        if pattern_type not in self.pattern_templates:
            return None

        template = self.pattern_templates[pattern_type]

        # Fill in template with observation data
        try:
            title = template["title_template"].format(**kwargs)
            description = template["description_template"].format(**kwargs)
            explanation = template["explanation_template"].format(**kwargs)

            # Calculate confidence based on observation confidence and pattern fit
            base_confidence = observation.confidence
            pattern_fit_bonus = 0.1 if self._matches_pattern(observation, pattern_type) else 0
            confidence = min(1.0, base_confidence + pattern_fit_bonus)

            # Generate required evidence
            required_evidence = []
            for evidence_template in template.get("required_evidence", []):
                try:
                    evidence_desc = evidence_template.format(**kwargs)
                    required_evidence.append(evidence_desc)
                except KeyError:
                    # Skip evidence that can't be formatted
                    pass

            hypothesis = Hypothesis(
                id=f"hyp-{uuid.uuid4().hex[:12]}",
                title=title,
                description=description,
                explanation=explanation,
                type=pattern_type,
                confidence=confidence,
                priority=self._calculate_priority(observation, pattern_type),
                supporting_evidence=[observation.id],
                related_entities=entities,
                required_evidence=required_evidence,
            )

            return hypothesis

        except Exception as e:
            logger.warning(f"Failed to create hypothesis from template: {e}")
            return None

    def _matches_pattern(self, observation: Observation, pattern_type: str) -> bool:
        """Check if an observation matches a specific pattern type."""
        pattern_indicators = {
            "lateral_movement": ["network", "connection", "access", "authentication"],
            "data_exfiltration": ["large", "volume", "transfer", "outbound", "upload"],
            "privilege_escalation": ["admin", "root", "sudo", "elevated", "privilege"],
            "persistence_mechanism": ["startup", "scheduled", "registry", "service", "boot"],
            "command_control": ["beacon", "callback", "c2", "command", "control"],
        }

        indicators = pattern_indicators.get(pattern_type, [])
        observation_text = observation.description.lower()

        return any(indicator in observation_text for indicator in indicators)

    def _calculate_priority(self, observation: Observation, pattern_type: str) -> int:
        """Calculate priority for a hypothesis based on observation and pattern."""
        # Base priority from observation confidence (0.0-1.0 maps to 1-5)
        base_priority = max(1, min(5, int(observation.confidence * 5) + 1))

        # Pattern-specific priority adjustments
        pattern_priorities = {
            "command_control": 2,  # Higher priority for C2 activity
            "data_exfiltration": 2,  # Higher priority for data theft
            "privilege_escalation": 1,  # Moderate priority increase
            "persistence_mechanism": 1,  # Moderate priority increase
        }

        adjustment = pattern_priorities.get(pattern_type, 0)
        final_priority = min(5, base_priority + adjustment)

        return final_priority

    def _calculate_hypothesis_hash(self, hypothesis: Hypothesis) -> str:
        """Calculate a hash for a hypothesis to detect duplicates."""
        content = f"{hypothesis.title}{hypothesis.description}{hypothesis.type}"
        return hashlib.md5(content.encode()).hexdigest()

    def _is_diverse(self, hypothesis: Hypothesis, existing_hypotheses: list[Hypothesis]) -> bool:
        """Check if a hypothesis is sufficiently diverse from existing ones."""
        if not existing_hypotheses:
            return True

        # Calculate similarity to existing hypotheses
        similarities = []
        for existing in existing_hypotheses:
            similarity = self._calculate_similarity(hypothesis, existing)
            similarities.append(similarity)

        # If any existing hypothesis is too similar, reject this one
        max_similarity = max(similarities) if similarities else 0
        return max_similarity < self.diversity_threshold

    def _calculate_similarity(self, hypothesis1: Hypothesis, hypothesis2: Hypothesis) -> float:
        """Calculate similarity between two hypotheses (0.0 to 1.0)."""
        # Simple word overlap similarity for now
        words1 = set(hypothesis1.title.lower().split() + hypothesis1.description.lower().split())
        words2 = set(hypothesis2.title.lower().split() + hypothesis2.description.lower().split())

        intersection = words1.intersection(words2)
        union = words1.union(words2)

        if not union:
            return 0.0

        return len(intersection) / len(union)

    def rank_hypotheses(self, hypotheses: list[Hypothesis]) -> list[Hypothesis]:
        """Rank hypotheses by novelty, impact, and confidence."""

        # Sort by weighted score: confidence (40%) + priority (30%) + novelty (30%)
        def ranking_score(hypothesis: Hypothesis) -> float:
            confidence_component = hypothesis.confidence * 0.4
            priority_component = (hypothesis.priority / 5.0) * 0.3
            novelty_component = self._calculate_novelty_score(hypothesis) * 0.3
            return confidence_component + priority_component + novelty_component

        return sorted(hypotheses, key=ranking_score, reverse=True)

    def _calculate_novelty_score(self, hypothesis: Hypothesis) -> float:
        """Calculate novelty score for a hypothesis (0.0 to 1.0)."""
        # For now, use a simple heuristic based on pattern uniqueness and entity combinations
        # In a real implementation, this would use ML models to assess true novelty
        base_score = 0.5  # Default mid-range score

        # Increase for less common patterns
        rare_patterns = ["persistence_mechanism", "command_control"]
        if hypothesis.type in rare_patterns:
            base_score += 0.2

        # Decrease for common patterns
        common_patterns = ["lateral_movement"]
        if hypothesis.type in common_patterns:
            base_score -= 0.1

        return max(0.0, min(1.0, base_score))


# Global instance
hypothesis_generator = HypothesisGenerator()

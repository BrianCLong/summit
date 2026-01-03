"""
LLM-Powered Scenario Generator

Provides AI-powered generation of:
- Adversarial scenarios
- Threat actor profiles
- Evolved tactics
- Attack content for training
- Defense strategies
"""

import json
import logging
import re
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field

from .claude_client import ClaudeClient, LLMConfig, LLMResponse
from .prompts import PromptTemplates, PromptType

logger = logging.getLogger(__name__)


@dataclass
class GeneratedScenario:
    """A generated adversarial scenario."""
    name: str
    description: str
    exercise_type: str
    difficulty: str
    objectives: List[str]
    success_criteria: List[str]
    attack_vectors: List[str]
    target_platforms: List[str]
    timeline_hours: int
    required_resources: List[str]
    detection_opportunities: List[str]
    mitigation_strategies: List[str]
    raw_response: Optional[str] = None


@dataclass
class GeneratedThreatActor:
    """A generated threat actor profile."""
    name: str
    description: str
    sophistication_level: int
    motivation: str
    geographic_focus: List[str]
    primary_tactics: List[str]
    preferred_platforms: List[str]
    known_campaigns: List[str]
    technical_capabilities: List[str]
    operational_patterns: Dict[str, str]
    indicators_of_compromise: List[str]
    defensive_recommendations: List[str]
    raw_response: Optional[str] = None


@dataclass
class EvolvedTactic:
    """An evolved tactic from LLM generation."""
    original_tactic: str
    evolved_name: str
    evolved_description: str
    evolution_type: str
    key_changes: List[str]
    evasion_techniques: List[str]
    estimated_detection_difficulty: str
    detection_signatures: List[str]
    recommended_countermeasures: List[str]
    raw_response: Optional[str] = None


@dataclass
class GeneratedAttackContent:
    """Generated attack content for training."""
    content_type: str
    training_label: str
    sample_content: str
    persuasion_techniques: List[str]
    emotional_triggers: List[str]
    credibility_markers: List[str]
    detection_indicators: List[str]
    fact_check_points: List[str]
    educational_notes: str
    raw_response: Optional[str] = None


@dataclass
class DefenseStrategy:
    """A generated defense strategy."""
    strategy_name: str
    threat_summary: str
    defense_layers: List[Dict[str, Any]]
    detection_rules: List[str]
    response_playbook: List[Dict[str, Any]]
    metrics: List[str]
    resource_requirements: Dict[str, str]
    raw_response: Optional[str] = None


class LLMScenarioGenerator:
    """
    LLM-powered generator for adversarial scenarios and related content.

    Uses Claude API to generate realistic training scenarios, threat actor
    profiles, evolved tactics, and defense strategies.
    """

    def __init__(self, config: Optional[LLMConfig] = None):
        """Initialize the scenario generator."""
        self.client = ClaudeClient(config)
        self._initialized = False

    def initialize(self) -> bool:
        """Initialize the LLM client."""
        if self._initialized:
            return True

        if not self.client.is_available():
            logger.warning("LLM client not available. Scenario generation will be disabled.")
            return False

        self._initialized = self.client.initialize()
        return self._initialized

    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract JSON from LLM response text."""
        # Try to find JSON in code blocks first
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Try to find raw JSON
        try:
            # Find the first { and last } to extract JSON
            start = text.find('{')
            end = text.rfind('}')
            if start != -1 and end != -1 and end > start:
                return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass

        logger.warning("Failed to extract JSON from LLM response")
        return None

    def generate_scenario(
        self,
        exercise_type: str = "purple_team",
        difficulty: str = "intermediate",
        target_domain: str = "social_media",
        constraints: Optional[str] = None,
    ) -> Optional[GeneratedScenario]:
        """
        Generate an adversarial scenario using LLM.

        Args:
            exercise_type: Type of exercise (red_team, blue_team, purple_team)
            difficulty: Difficulty level (beginner, intermediate, advanced, expert)
            target_domain: Target domain for the scenario
            constraints: Any constraints or requirements

        Returns:
            GeneratedScenario or None if generation failed
        """
        if not self.initialize():
            return None

        prompt = PromptTemplates.format_prompt(
            PromptType.SCENARIO_GENERATION,
            exercise_type=exercise_type,
            difficulty=difficulty,
            target_domain=target_domain,
            constraints=constraints or "None specified",
        )

        response = self.client.complete(
            prompt=prompt,
            system=PromptTemplates.get_system_prompt(),
            temperature=0.8,
        )

        if not response:
            return None

        data = self._extract_json(response.content)
        if not data:
            return None

        try:
            return GeneratedScenario(
                name=data.get("name", "Unknown Scenario"),
                description=data.get("description", ""),
                exercise_type=data.get("exercise_type", exercise_type),
                difficulty=data.get("difficulty", difficulty),
                objectives=data.get("objectives", []),
                success_criteria=data.get("success_criteria", []),
                attack_vectors=data.get("attack_vectors", []),
                target_platforms=data.get("target_platforms", []),
                timeline_hours=data.get("timeline_hours", 24),
                required_resources=data.get("required_resources", []),
                detection_opportunities=data.get("detection_opportunities", []),
                mitigation_strategies=data.get("mitigation_strategies", []),
                raw_response=response.content,
            )
        except Exception as e:
            logger.error(f"Failed to parse scenario response: {e}")
            return None

    def generate_threat_actor(
        self,
        sophistication: int = 5,
        tactics: Optional[List[str]] = None,
        geographic_focus: str = "global",
        motivation: str = "political",
    ) -> Optional[GeneratedThreatActor]:
        """
        Generate a threat actor profile using LLM.

        Args:
            sophistication: Sophistication level (1-10)
            tactics: Primary tactics to include
            geographic_focus: Geographic focus area
            motivation: Primary motivation type

        Returns:
            GeneratedThreatActor or None if generation failed
        """
        if not self.initialize():
            return None

        tactics = tactics or ["social_engineering", "misinformation"]

        prompt = PromptTemplates.format_prompt(
            PromptType.THREAT_ACTOR_PROFILE,
            sophistication=sophistication,
            tactics=json.dumps(tactics),
            geographic_focus=geographic_focus,
            motivation=motivation,
        )

        response = self.client.complete(
            prompt=prompt,
            system=PromptTemplates.get_system_prompt(),
            temperature=0.7,
        )

        if not response:
            return None

        data = self._extract_json(response.content)
        if not data:
            return None

        try:
            return GeneratedThreatActor(
                name=data.get("name", "Unknown Actor"),
                description=data.get("description", ""),
                sophistication_level=data.get("sophistication_level", sophistication),
                motivation=data.get("motivation", motivation),
                geographic_focus=data.get("geographic_focus", [geographic_focus]),
                primary_tactics=data.get("primary_tactics", tactics),
                preferred_platforms=data.get("preferred_platforms", []),
                known_campaigns=data.get("known_campaigns", []),
                technical_capabilities=data.get("technical_capabilities", []),
                operational_patterns=data.get("operational_patterns", {}),
                indicators_of_compromise=data.get("indicators_of_compromise", []),
                defensive_recommendations=data.get("defensive_recommendations", []),
                raw_response=response.content,
            )
        except Exception as e:
            logger.error(f"Failed to parse threat actor response: {e}")
            return None

    def evolve_tactic(
        self,
        tactic_name: str,
        tactic_description: str,
        tactic_category: str,
        detection_rate: float,
    ) -> Optional[EvolvedTactic]:
        """
        Evolve a tactic using LLM to create a more sophisticated variant.

        Args:
            tactic_name: Name of the original tactic
            tactic_description: Description of the original tactic
            tactic_category: Category of the tactic
            detection_rate: Current detection rate (0-100)

        Returns:
            EvolvedTactic or None if generation failed
        """
        if not self.initialize():
            return None

        prompt = PromptTemplates.format_prompt(
            PromptType.TACTIC_EVOLUTION,
            tactic_name=tactic_name,
            tactic_description=tactic_description,
            tactic_category=tactic_category,
            detection_rate=detection_rate,
        )

        response = self.client.complete(
            prompt=prompt,
            system=PromptTemplates.get_system_prompt(),
            temperature=0.9,  # Higher temperature for creative evolution
        )

        if not response:
            return None

        data = self._extract_json(response.content)
        if not data:
            return None

        try:
            return EvolvedTactic(
                original_tactic=data.get("original_tactic", tactic_name),
                evolved_name=data.get("evolved_name", f"Evolved {tactic_name}"),
                evolved_description=data.get("evolved_description", ""),
                evolution_type=data.get("evolution_type", "mutation"),
                key_changes=data.get("key_changes", []),
                evasion_techniques=data.get("evasion_techniques", []),
                estimated_detection_difficulty=data.get("estimated_detection_difficulty", "medium"),
                detection_signatures=data.get("detection_signatures", []),
                recommended_countermeasures=data.get("recommended_countermeasures", []),
                raw_response=response.content,
            )
        except Exception as e:
            logger.error(f"Failed to parse tactic evolution response: {e}")
            return None

    def generate_attack_content(
        self,
        content_type: str = "misinformation_narrative",
        target_audience: str = "general_public",
        scenario_context: str = "election_integrity",
        modality: str = "text",
    ) -> Optional[GeneratedAttackContent]:
        """
        Generate attack content for training purposes.

        Args:
            content_type: Type of attack content
            target_audience: Target audience for the content
            scenario_context: Context/scenario for the content
            modality: Content modality (text, image_description, etc.)

        Returns:
            GeneratedAttackContent or None if generation failed
        """
        if not self.initialize():
            return None

        prompt = PromptTemplates.format_prompt(
            PromptType.ATTACK_CONTENT,
            content_type=content_type,
            target_audience=target_audience,
            scenario_context=scenario_context,
            modality=modality,
        )

        response = self.client.complete(
            prompt=prompt,
            system=PromptTemplates.get_system_prompt(),
            temperature=0.7,
        )

        if not response:
            return None

        data = self._extract_json(response.content)
        if not data:
            return None

        try:
            return GeneratedAttackContent(
                content_type=data.get("content_type", content_type),
                training_label=data.get("training_label", "[TRAINING ONLY]"),
                sample_content=data.get("sample_content", ""),
                persuasion_techniques=data.get("persuasion_techniques", []),
                emotional_triggers=data.get("emotional_triggers", []),
                credibility_markers=data.get("credibility_markers", []),
                detection_indicators=data.get("detection_indicators", []),
                fact_check_points=data.get("fact_check_points", []),
                educational_notes=data.get("educational_notes", ""),
                raw_response=response.content,
            )
        except Exception as e:
            logger.error(f"Failed to parse attack content response: {e}")
            return None

    def generate_defense_strategy(
        self,
        threat_scenario: str,
        org_type: str = "enterprise",
        capabilities: Optional[str] = None,
        constraints: Optional[str] = None,
    ) -> Optional[DefenseStrategy]:
        """
        Generate a defense strategy for a threat scenario.

        Args:
            threat_scenario: Description of the threat scenario
            org_type: Type of organization
            capabilities: Current defensive capabilities
            constraints: Resource constraints

        Returns:
            DefenseStrategy or None if generation failed
        """
        if not self.initialize():
            return None

        prompt = PromptTemplates.format_prompt(
            PromptType.DEFENSE_STRATEGY,
            threat_scenario=threat_scenario,
            org_type=org_type,
            capabilities=capabilities or "Standard security stack",
            constraints=constraints or "Moderate budget, limited personnel",
        )

        response = self.client.complete(
            prompt=prompt,
            system=PromptTemplates.get_system_prompt(),
            temperature=0.6,  # Lower temperature for more structured output
        )

        if not response:
            return None

        data = self._extract_json(response.content)
        if not data:
            return None

        try:
            return DefenseStrategy(
                strategy_name=data.get("strategy_name", "Defense Strategy"),
                threat_summary=data.get("threat_summary", ""),
                defense_layers=data.get("defense_layers", []),
                detection_rules=data.get("detection_rules", []),
                response_playbook=data.get("response_playbook", []),
                metrics=data.get("metrics", []),
                resource_requirements=data.get("resource_requirements", {}),
                raw_response=response.content,
            )
        except Exception as e:
            logger.error(f"Failed to parse defense strategy response: {e}")
            return None

    def analyze_narrative(
        self,
        content: str,
        source: str = "unknown",
        channel: str = "social_media",
        origin: str = "unverified",
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze content for misinformation indicators.

        Args:
            content: Content to analyze
            source: Source of the content
            channel: Distribution channel
            origin: Claimed origin

        Returns:
            Analysis results dict or None if analysis failed
        """
        if not self.initialize():
            return None

        prompt = PromptTemplates.format_prompt(
            PromptType.NARRATIVE_ANALYSIS,
            content=content,
            source=source,
            channel=channel,
            origin=origin,
        )

        response = self.client.complete(
            prompt=prompt,
            system=PromptTemplates.get_system_prompt(),
            temperature=0.3,  # Low temperature for analytical tasks
        )

        if not response:
            return None

        return self._extract_json(response.content)

    def get_usage_stats(self) -> Dict[str, Any]:
        """Get usage statistics from the LLM client."""
        return self.client.get_usage_stats()

    def is_available(self) -> bool:
        """Check if the generator is available."""
        return self.client.is_available()

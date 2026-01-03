"""
Prompt Templates for LLM-Powered Scenario Generation

Provides structured prompts for generating:
- Attack scenarios
- Threat actor profiles
- Tactic evolution
- Attack content (for training purposes)
- Defense strategies
"""

from typing import Dict, Any, Optional
from enum import Enum


class PromptType(Enum):
    """Types of prompts available."""
    SCENARIO_GENERATION = "scenario_generation"
    THREAT_ACTOR_PROFILE = "threat_actor_profile"
    TACTIC_EVOLUTION = "tactic_evolution"
    ATTACK_CONTENT = "attack_content"
    DEFENSE_STRATEGY = "defense_strategy"
    NARRATIVE_ANALYSIS = "narrative_analysis"


class PromptTemplates:
    """Collection of prompt templates for scenario generation."""

    SYSTEM_PROMPT = """You are an expert security researcher and red team specialist working on
defensive cybersecurity training. Your role is to help security teams understand and defend
against misinformation and adversarial attacks by generating realistic training scenarios.

IMPORTANT GUIDELINES:
1. All generated content is for DEFENSIVE TRAINING PURPOSES ONLY
2. Mark all attack content with [TRAINING ONLY] prefix
3. Focus on educational value and detection techniques
4. Never generate content that could cause real-world harm
5. Include defensive recommendations with all attack scenarios
6. Maintain professional, academic tone throughout

You specialize in:
- Misinformation campaign tactics and detection
- Social engineering techniques and defenses
- Deepfake and synthetic media analysis
- Coordinated inauthentic behavior patterns
- Information warfare strategies"""

    SCENARIO_GENERATION = """Generate a realistic adversarial misinformation scenario for security training.

PARAMETERS:
- Exercise Type: {exercise_type}
- Difficulty Level: {difficulty}
- Target Domain: {target_domain}
- Constraints: {constraints}

OUTPUT FORMAT (JSON):
{{
    "name": "Scenario name",
    "description": "Detailed scenario description",
    "exercise_type": "{exercise_type}",
    "difficulty": "{difficulty}",
    "objectives": ["objective1", "objective2", ...],
    "success_criteria": ["criterion1", "criterion2", ...],
    "attack_vectors": ["vector1", "vector2", ...],
    "target_platforms": ["platform1", "platform2", ...],
    "timeline_hours": <estimated duration>,
    "required_resources": ["resource1", "resource2", ...],
    "detection_opportunities": ["opportunity1", "opportunity2", ...],
    "mitigation_strategies": ["strategy1", "strategy2", ...]
}}

Generate a realistic, detailed scenario that would be valuable for training blue team defenders."""

    THREAT_ACTOR_PROFILE = """Generate a realistic threat actor profile for security training exercises.

PARAMETERS:
- Sophistication Level: {sophistication} (1-10 scale)
- Primary Tactics: {tactics}
- Geographic Focus: {geographic_focus}
- Motivation Type: {motivation}

OUTPUT FORMAT (JSON):
{{
    "name": "Threat actor name/designation",
    "description": "Background and operational history",
    "sophistication_level": {sophistication},
    "motivation": "{motivation}",
    "geographic_focus": ["{geographic_focus}"],
    "primary_tactics": {tactics},
    "preferred_platforms": ["platform1", "platform2", ...],
    "known_campaigns": ["campaign1", "campaign2", ...],
    "technical_capabilities": ["capability1", "capability2", ...],
    "operational_patterns": {{
        "activity_hours": "description",
        "campaign_duration": "description",
        "target_selection": "description"
    }},
    "indicators_of_compromise": ["ioc1", "ioc2", ...],
    "defensive_recommendations": ["recommendation1", "recommendation2", ...]
}}

Create a realistic profile based on known threat actor patterns and TTPs."""

    TACTIC_EVOLUTION = """Analyze and evolve a misinformation tactic based on current detection rates.

CURRENT TACTIC:
- Name: {tactic_name}
- Description: {tactic_description}
- Category: {tactic_category}
- Current Detection Rate: {detection_rate}%

EVOLUTION GOAL: Generate a more sophisticated variant that might evade current detection while maintaining the core objective.

OUTPUT FORMAT (JSON):
{{
    "original_tactic": "{tactic_name}",
    "evolved_name": "New tactic name",
    "evolved_description": "Description of evolved tactic",
    "evolution_type": "mutation|combination|adaptation",
    "key_changes": ["change1", "change2", ...],
    "evasion_techniques": ["technique1", "technique2", ...],
    "estimated_detection_difficulty": "low|medium|high",
    "detection_signatures": ["signature1", "signature2", ...],
    "recommended_countermeasures": ["countermeasure1", "countermeasure2", ...]
}}

Focus on realistic evolution patterns observed in actual misinformation campaigns."""

    ATTACK_CONTENT_GENERATION = """[TRAINING CONTENT GENERATION]

Generate example attack content for security training purposes.

PARAMETERS:
- Content Type: {content_type}
- Target Audience: {target_audience}
- Scenario Context: {scenario_context}
- Modality: {modality}

OUTPUT FORMAT (JSON):
{{
    "content_type": "{content_type}",
    "training_label": "[TRAINING ONLY]",
    "sample_content": "The generated content sample",
    "persuasion_techniques": ["technique1", "technique2", ...],
    "emotional_triggers": ["trigger1", "trigger2", ...],
    "credibility_markers": ["marker1", "marker2", ...],
    "detection_indicators": ["indicator1", "indicator2", ...],
    "fact_check_points": ["point1", "point2", ...],
    "educational_notes": "Explanation of why this content is effective and how to detect it"
}}

IMPORTANT: All content must be clearly marked as training material and include detection guidance."""

    DEFENSE_STRATEGY = """Generate a comprehensive defense strategy for the following threat scenario.

THREAT SCENARIO:
{threat_scenario}

DEFENDER CONTEXT:
- Organization Type: {org_type}
- Current Capabilities: {capabilities}
- Resource Constraints: {constraints}

OUTPUT FORMAT (JSON):
{{
    "strategy_name": "Strategy name",
    "threat_summary": "Brief threat description",
    "defense_layers": [
        {{
            "layer": "Prevention|Detection|Response|Recovery",
            "measures": ["measure1", "measure2", ...],
            "tools": ["tool1", "tool2", ...],
            "priority": "high|medium|low"
        }}
    ],
    "detection_rules": ["rule1", "rule2", ...],
    "response_playbook": [
        {{
            "step": 1,
            "action": "Action description",
            "responsible_party": "Team/Role",
            "time_estimate": "Duration"
        }}
    ],
    "metrics": ["metric1", "metric2", ...],
    "resource_requirements": {{
        "personnel": "Requirements",
        "technology": "Requirements",
        "budget": "Estimate"
    }}
}}

Provide actionable, practical defense recommendations."""

    NARRATIVE_ANALYSIS = """Analyze the following content for misinformation indicators.

CONTENT:
{content}

CONTEXT:
- Source: {source}
- Distribution Channel: {channel}
- Claimed Origin: {origin}

OUTPUT FORMAT (JSON):
{{
    "content_summary": "Brief summary",
    "credibility_score": <0.0-1.0>,
    "misinformation_indicators": [
        {{
            "indicator": "Indicator name",
            "evidence": "Supporting evidence",
            "severity": "high|medium|low"
        }}
    ],
    "manipulation_techniques": ["technique1", "technique2", ...],
    "fact_check_results": [
        {{
            "claim": "Specific claim",
            "verdict": "true|false|misleading|unverifiable",
            "explanation": "Reasoning"
        }}
    ],
    "source_credibility": {{
        "authenticity": "Assessment",
        "track_record": "Assessment",
        "potential_biases": ["bias1", "bias2", ...]
    }},
    "recommended_actions": ["action1", "action2", ...]
}}

Provide thorough, evidence-based analysis."""

    @classmethod
    def get_template(cls, prompt_type: PromptType) -> str:
        """Get the template for a specific prompt type."""
        templates = {
            PromptType.SCENARIO_GENERATION: cls.SCENARIO_GENERATION,
            PromptType.THREAT_ACTOR_PROFILE: cls.THREAT_ACTOR_PROFILE,
            PromptType.TACTIC_EVOLUTION: cls.TACTIC_EVOLUTION,
            PromptType.ATTACK_CONTENT: cls.ATTACK_CONTENT_GENERATION,
            PromptType.DEFENSE_STRATEGY: cls.DEFENSE_STRATEGY,
            PromptType.NARRATIVE_ANALYSIS: cls.NARRATIVE_ANALYSIS,
        }
        return templates.get(prompt_type, "")

    @classmethod
    def format_prompt(cls, prompt_type: PromptType, **kwargs: Any) -> str:
        """Format a prompt template with provided parameters."""
        template = cls.get_template(prompt_type)
        if not template:
            raise ValueError(f"Unknown prompt type: {prompt_type}")

        try:
            return template.format(**kwargs)
        except KeyError as e:
            raise ValueError(f"Missing required parameter: {e}")

    @classmethod
    def get_system_prompt(cls) -> str:
        """Get the system prompt for Claude."""
        return cls.SYSTEM_PROMPT

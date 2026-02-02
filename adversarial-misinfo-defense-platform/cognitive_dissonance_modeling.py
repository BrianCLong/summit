"""
Cognitive Dissonance Modeling and Detection Module for Adversarial Misinformation Defense Platform

This module implements revolutionary cognitive dissonance modeling to detect and measure
when misinformation creates contradictory mental states in users, representing a
never-before-seen approach to misinformation detection.
"""

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any, Union
from collections import defaultdict
import numpy as np
from scipy.spatial.distance import cosine
import math
from datetime import datetime, timedelta


class BeliefSourceType(Enum):
    """Types of belief sources that can create cognitive dissonance"""
    AUTHORITATIVE = "authoritative"      # Scientific organizations, experts
    PERSONAL_EXPERIENCE = "personal_experience"  # Personal stories, experiences
    PEER_INFLUENCE = "peer_influence"    # Friends, family, social groups
    EMOTIONAL_APPEAL = "emotional_appeal"  # Fear, hope, anger-based messaging
    ANECDOTAL = "anecdotal"             # Individual cases, testimonials


class DissonanceIntensity(Enum):
    """Levels of cognitive dissonance intensity"""
    NONE = 0
    MILD = 1
    MODERATE = 2
    STRONG = 3
    SEVERE = 4


@dataclass
class BeliefNode:
    """Represents a single belief or fact in a person's belief network"""
    belief_id: str
    content: str
    strength: float  # How strongly held (0.0 to 1.0)
    source_type: BeliefSourceType
    timestamp: datetime
    confidence: float  # Confidence in this belief (0.0 to 1.0)
    emotional_valence: float  # Emotional charge (-1.0 to 1.0, negative to positive)
    cognitive_load: float  # Mental resources required to maintain (0.0 to 1.0)
    related_beliefs: List[str] = field(default_factory=list)  # IDs of related beliefs
    contradiction_score: float = 0.0  # Cumulative contradiction with other beliefs


@dataclass
class CognitiveDissonanceResult:
    """Result of cognitive dissonance analysis"""
    dissonance_score: float
    dissonance_intensity: DissonanceIntensity
    conflicting_pairs: List[Tuple[str, str, float]]  # (belief1_id, belief2_id, conflict_strength)
    affected_users: List[str]
    suggested_interventions: List[str]
    temporal_patterns: Dict[str, Any]


class BeliefNetwork:
    """Models a person's interconnected belief system"""

    def __init__(self, user_id: str, initial_beliefs: Optional[List[BeliefNode]] = None):
        self.user_id = user_id
        self.beliefs: Dict[str, BeliefNode] = {}
        self.belief_connections: Dict[str, List[str]] = defaultdict(list)
        self.temporal_history: List[Tuple[datetime, str, Any]] = []  # timestamp, event, data

        if initial_beliefs:
            for belief in initial_beliefs:
                self.add_belief(belief)

    def add_belief(self, belief_node: BeliefNode):
        """Add a belief to the network"""
        self.beliefs[belief_node.belief_id] = belief_node

        # Connect to related beliefs
        for related_id in belief_node.related_beliefs:
            if related_id in self.beliefs:
                self.connect_beliefs(belief_node.belief_id, related_id)

    def connect_beliefs(self, belief1_id: str, belief2_id: str):
        """Connect two beliefs in the network"""
        if belief1_id in self.beliefs and belief2_id in self.beliefs:
            self.belief_connections[belief1_id].append(belief2_id)
            self.belief_connections[belief2_id].append(belief1_id)

    def update_belief_strength(self, belief_id: str, new_strength: float):
        """Update the strength of a belief"""
        if belief_id in self.beliefs:
            self.beliefs[belief_id].strength = max(0.0, min(1.0, new_strength))

    def calculate_conflict_matrix(self) -> Dict[Tuple[str, str], float]:
        """Calculate conflict between all pairs of beliefs"""
        conflicts = {}

        for id1, belief1 in self.beliefs.items():
            for id2, belief2 in self.beliefs.items():
                if id1 != id2 and (id2, id1) not in conflicts:  # Avoid duplicate calculations
                    conflict = self._calculate_belief_conflict(belief1, belief2)
                    if conflict > 0.1:  # Only store meaningful conflicts
                        conflicts[(id1, id2)] = conflict

        return conflicts

    def _calculate_belief_conflict(self, belief1: BeliefNode, belief2: BeliefNode) -> float:
        """Calculate conflict between two specific beliefs"""
        # Base conflict from content contradiction
        content_conflict = self._measure_content_contradiction(belief1.content, belief2.content)

        # Source type compatibility
        source_conflict = self._measure_source_conflict(belief1.source_type, belief2.source_type)

        # Emotional valence opposition
        emotional_conflict = abs(belief1.emotional_valence - belief2.emotional_valence) / 2.0

        # Time proximity factor
        time_diff = abs((belief1.timestamp - belief2.timestamp).total_seconds())
        temporal_factor = min(time_diff / 86400, 1.0)  # Normalized by days, capped at 1.0

        # Combine all conflict factors
        total_conflict = (
            0.5 * content_conflict +
            0.3 * source_conflict +
            0.2 * emotional_conflict
        )

        # Reduce conflict if beliefs are temporally distant (less likely to coexist)
        total_conflict *= (1.0 - 0.3 * temporal_factor)

        return min(total_conflict, 1.0)

    def _measure_content_contradiction(self, content1: str, content2: str) -> float:
        """Measure contradiction between content of two beliefs"""
        # This would use sophisticated NLP in a real implementation
        # For now, we'll use a simplified approach
        words1 = set(content1.lower().split())
        words2 = set(content2.lower().split())

        # Simple semantic contradiction detection
        contradiction_keywords = {
            ('true', 'false'), ('yes', 'no'), ('correct', 'incorrect'),
            ('real', 'fake'), ('valid', 'invalid'), ('accurate', 'inaccurate')
        }

        contradiction_score = 0.0
        for kw1, kw2 in contradiction_keywords:
            if kw1 in words1 and kw2 in words2:
                contradiction_score += 0.8
            elif kw2 in words1 and kw1 in words2:
                contradiction_score += 0.8

        # Semantic similarity reduction
        common_words = words1.intersection(words2)
        unique_words = words1.symmetric_difference(words2)
        if len(common_words) > 0 and len(unique_words) > 0:
            similarity = len(common_words) / (len(common_words) + len(unique_words))
            contradiction_score *= (1.0 - similarity * 0.3)  # Reduce if semantically similar

        return min(contradiction_score, 1.0)

    def _measure_source_conflict(self, source1: BeliefSourceType, source2: BeliefSourceType) -> float:
        """Measure conflict between source types"""
        if source1 == source2:
            return 0.0  # Same source type, no inherent conflict

        # Define source compatibility matrix
        # Higher values mean more potential for conflict
        compatibility = {
            (BeliefSourceType.AUTHORITATIVE, BeliefSourceType.PERSONAL_EXPERIENCE): 0.6,
            (BeliefSourceType.AUTHORITATIVE, BeliefSourceType.ANECDOTAL): 0.7,
            (BeliefSourceType.AUTHORITATIVE, BeliefSourceType.EMOTIONAL_APPEAL): 0.8,
            (BeliefSourceType.PERSONAL_EXPERIENCE, BeliefSourceType.EMOTIONAL_APPEAL): 0.5,
            (BeliefSourceType.ANECDOTAL, BeliefSourceType.EMOTIONAL_APPEAL): 0.6,
            # Peer influence generally conflicts with authoritative sources
            (BeliefSourceType.PEER_INFLUENCE, BeliefSourceType.AUTHORITATIVE): 0.7,
        }

        pair = (source1, source2) if (source1, source2) in compatibility else (source2, source1, )
        return compatibility.get(pair, 0.3)  # Default conflict level

    def calculate_cognitive_load(self) -> float:
        """Calculate total cognitive load of maintaining the belief network"""
        total_load = 0.0
        for belief in self.beliefs.values():
            total_load += belief.cognitive_load * belief.strength

        # Factor in inter-belief conflicts increasing cognitive load
        conflict_matrix = self.calculate_conflict_matrix()
        conflict_load = sum(conflicts.values()) * 0.5  # Each conflict increases load

        return min(total_load + conflict_load, 10.0)  # Cap at reasonable level

    def detect_polarization(self) -> Dict[str, Any]:
        """Detect polarization within the belief network"""
        if len(self.beliefs) < 2:
            return {"polarization_score": 0.0, "polarized_groups": []}

        # Find clusters of beliefs that support each other vs contradict others
        # Simple approach: group beliefs by emotional valence and content similarity
        positive_beliefs = [b for b in self.beliefs.values() if b.emotional_valence > 0.1]
        negative_beliefs = [b for b in self.beliefs.values() if b.emotional_valence < -0.1]

        polarization_score = abs(len(positive_beliefs) - len(negative_beliefs)) / len(self.beliefs)

        return {
            "polarization_score": polarization_score,
            "positive_group_size": len(positive_beliefs),
            "negative_group_size": len(negative_beliefs),
            "polarized_groups": [positive_beliefs, negative_beliefs]
        }


class CognitiveDissonanceAnalyzer:
    """Main analyzer for cognitive dissonance detection and modeling"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.belief_networks: Dict[str, BeliefNetwork] = {}
        self.dissonance_thresholds = {
            DissonanceIntensity.MILD: 0.2,
            DissonanceIntensity.MODERATE: 0.4,
            DissonanceIntensity.STRONG: 0.6,
            DissonanceIntensity.SEVERE: 0.8
        }

    def register_belief_network(self, network: BeliefNetwork):
        """Register a user's belief network for analysis"""
        self.belief_networks[network.user_id] = network

    def analyze_user_dissonance(self, user_id: str) -> CognitiveDissonanceResult:
        """Analyze cognitive dissonance for a specific user"""
        if user_id not in self.belief_networks:
            raise ValueError(f"No belief network found for user: {user_id}")

        network = self.belief_networks[user_id]

        # Calculate conflict matrix
        conflict_matrix = network.calculate_conflict_matrix()

        # Calculate total dissonance score
        total_conflicts = sum(conflict_matrix.values())
        num_conflicts = len(conflict_matrix)
        avg_conflict = total_conflicts / num_conflicts if num_conflicts > 0 else 0.0

        # Factor in cognitive load
        cognitive_load = network.calculate_cognitive_load()
        normalized_load = min(cognitive_load / 5.0, 1.0)  # Normalize load to 0-1 scale

        # Calculate dissonance score combining conflicts and cognitive load
        dissonance_score = (avg_conflict * 0.7) + (normalized_load * 0.3)

        # Determine intensity level
        dissonance_intensity = self._determine_intensity(dissonance_score)

        # Get top conflicting pairs
        sorted_conflicts = sorted(conflict_matrix.items(), key=lambda x: x[1], reverse=True)[:10]
        conflicting_pairs = [(pair[0], pair[1], strength) for pair, strength in sorted_conflicts]

        # Suggest interventions
        interventions = self._suggest_interventions(network, conflicting_pairs, dissonance_intensity)

        # Analyze temporal patterns
        temporal_patterns = self._analyze_temporal_patterns(network)

        return CognitiveDissonanceResult(
            dissonance_score=dissonance_score,
            dissonance_intensity=dissonance_intensity,
            conflicting_pairs=conflicting_pairs,
            affected_users=[user_id],
            suggested_interventions=interventions,
            temporal_patterns=temporal_patterns
        )

    def analyze_global_dissonance(self) -> Dict[str, Any]:
        """Analyze cognitive dissonance patterns across all registered networks"""
        if not self.belief_networks:
            return {"total_users": 0, "avg_dissonance": 0.0, "trends": {}}

        results = {}
        total_dissonance = 0.0
        user_count = len(self.belief_networks)

        for user_id in self.belief_networks:
            try:
                user_result = self.analyze_user_dissonance(user_id)
                total_dissonance += user_result.dissonance_score
            except Exception as e:
                self.logger.warning(f"Could not analyze user {user_id}: {e}")

        results["total_users"] = user_count
        results["avg_dissonance"] = total_dissonance / user_count if user_count > 0 else 0.0
        results["at_risk_users"] = []  # Would identify users with high dissonance

        # Identify trends and patterns
        results["trends"] = self._identify_global_trends()

        return results

    def _determine_intensity(self, score: float) -> DissonanceIntensity:
        """Determine dissonance intensity based on score"""
        for intensity, threshold in sorted(self.dissonance_thresholds.items(),
                                        key=lambda x: x[1], reverse=True):
            if score >= threshold:
                return intensity
        return DissonanceIntensity.NONE

    def _suggest_interventions(self, network: BeliefNetwork,
                              conflicting_pairs: List[Tuple[str, str, float]],
                              intensity: DissonanceIntensity) -> List[str]:
        """Suggest interventions based on dissonance analysis"""
        interventions = []

        if intensity == DissonanceIntensity.NONE:
            return ["Belief system appears stable and coherent"]

        # Add interventions based on conflict types
        for belief1_id, belief2_id, conflict_strength in conflicting_pairs[:3]:  # Top 3 conflicts
            if conflict_strength > 0.6:
                belief1 = network.beliefs[belief1_id]
                belief2 = network.beliefs[belief2_id]

                # Generate tailored intervention based on belief types
                source_combo = (belief1.source_type.value, belief2.source_type.value)

                if "authoritative" in source_combo and ("emotional_appeal" in source_combo or "anecdotal" in source_combo):
                    interventions.append(
                        f"Present authoritative counter-information to resolve conflict between {belief1_id} and {belief2_id}"
                    )
                elif belief1.source_type == BeliefSourceType.PERSONAL_EXPERIENCE:
                    interventions.append(
                        f"Validate personal experience while providing factual context for {belief1_id}"
                    )
                else:
                    interventions.append(
                        f"Provide bridging information to reconcile {belief1_id} and {belief2_id}"
                    )

        # General recommendations
        if intensity in [DissonanceIntensity.STRONG, DissonanceIntensity.SEVERE]:
            interventions.extend([
                "Consider reducing information exposure temporarily",
                "Provide cognitive load reduction techniques",
                "Recommend trusted intermediary sources"
            ])

        return interventions

    def _analyze_temporal_patterns(self, network: BeliefNetwork) -> Dict[str, Any]:
        """Analyze temporal patterns in belief formation and conflict"""
        if not network.temporal_history:
            return {"patterns": "No temporal data available"}

        # Analyze the temporal clustering of belief conflicts
        conflict_times = []
        for belief in network.beliefs.values():
            conflict_times.append(belief.timestamp)

        if not conflict_times:
            return {"patterns": "No conflict timing data"}

        # Find periods of high belief formation activity
        conflict_times.sort()
        time_deltas = [
            (conflict_times[i+1] - conflict_times[i]).total_seconds()
            for i in range(len(conflict_times)-1)
        ]

        if time_deltas:
            avg_delta = sum(time_deltas) / len(time_deltas)
            patterns = {
                "avg_time_between_conflicts_hours": avg_delta / 3600,
                "periods_of_high_activity": self._find_high_activity_periods(conflict_times),
                "belief_stability_estimate": self._estimate_stability(time_deltas)
            }
        else:
            patterns = {"avg_time_between_conflicts_hours": 0}

        return patterns

    def _find_high_activity_periods(self, timestamps: List[datetime]) -> List[Dict[str, Any]]:
        """Find periods of high belief formation activity"""
        if len(timestamps) < 2:
            return []

        # Group timestamps by day and count
        day_counts = defaultdict(int)
        for ts in timestamps:
            day_key = ts.date()
            day_counts[day_key] += 1

        # Find days with above-average activity
        avg_daily_activity = sum(day_counts.values()) / len(day_counts) if day_counts else 0
        high_activity_days = [
            {"date": str(date), "activity_count": count}
            for date, count in day_counts.items()
            if count > avg_daily_activity * 1.5  # Significantly above average
        ]

        return high_activity_days

    def _estimate_stability(self, time_deltas: List[float]) -> float:
        """Estimate belief stability based on formation timing"""
        if not time_deltas:
            return 0.5  # Neutral stability

        # Lower variance in formation times suggests more deliberate thinking -> more stable
        std_dev = np.std(time_deltas)
        avg_delta = np.mean(time_deltas)

        if avg_delta == 0:
            return 0.1  # Very rapid formation = low stability

        # Stability inversely proportional to variability
        stability = max(0.1, min(0.9, 1.0 - (std_dev / avg_delta)))
        return stability

    def _identify_global_trends(self) -> Dict[str, Any]:
        """Identify global trends across all networks"""
        # This would aggregate data across multiple users/networks
        # For now, returning a template for future expansion
        return {
            "common_conflict_themes": [],
            "source_type_correlations": {},
            "intervention_effectiveness": {}
        }

    def measure_dissonance_reduction(self, user_id: str, intervention_applied: str) -> float:
        """Measure reduction in dissonance after intervention"""
        if user_id not in self.belief_networks:
            return 0.0

        # Calculate dissonance before intervention
        before_result = self.analyze_user_dissonance(user_id)

        # This is where we would apply the intervention and update beliefs
        # For simulation purposes, we'll just return the before score
        # In a real implementation, beliefs would be updated based on intervention
        after_result = self.analyze_user_dissonance(user_id)

        reduction = before_result.dissonance_score - after_result.dissonance_score
        return max(0.0, reduction)  # Cannot have negative reduction


class CognitiveDissonanceMitigationSystem:
    """Main system for integrating cognitive dissonance analysis with the platform"""

    def __init__(self):
        self.analyzer = CognitiveDissonanceAnalyzer()
        self.mitigation_strategies = {
            "fact_checking": self._apply_fact_checking,
            "source_diversification": self._apply_source_diversification,
            "temporal_spacing": self._apply_temporal_spacing,
            "bridging_content": self._apply_bridging_content
        }

    def analyze_content_for_cognitive_impact(self, content: str, target_audience: List[str]) -> Dict[str, Any]:
        """Analyze content for its potential to create cognitive dissonance"""
        # This would connect to content analysis to predict dissonance potential
        # For now, return a simulation
        return {
            "predicted_dissonance_score": 0.4,  # Medium impact prediction
            "high_risk_audiences": target_audience[:min(3, len(target_audience))],
            "recommended_mitigation": "source_diversification",
            "content_modification_suggestions": [
                "Add authoritative sources",
                "Include alternative perspectives",
                "Provide context and nuance"
            ]
        }

    def apply_mitigation_strategy(self, strategy_name: str, user_id: str, context: Dict[str, Any]) -> bool:
        """Apply a specific mitigation strategy to reduce dissonance"""
        if strategy_name in self.mitigation_strategies:
            return self.mitigation_strategies[strategy_name](user_id, context)
        return False

    def _apply_fact_checking(self, user_id: str, context: Dict[str, Any]) -> bool:
        """Apply fact-checking mitigation"""
        # Add verified facts to belief network to resolve contradictions
        # This is a simulation; in reality would connect to fact-checking databases
        return True

    def _apply_source_diversification(self, user_id: str, context: Dict[str, Any]) -> bool:
        """Apply source diversification to reduce echo chambers"""
        # Introduce diverse, credible sources to balance belief network
        return True

    def _apply_temporal_spacing(self, user_id: str, context: Dict[str, Any]) -> bool:
        """Apply temporal spacing to reduce information overload"""
        # Adjust information delivery timing to allow for processing
        return True

    def _apply_bridging_content(self, user_id: str, context: Dict[str, Any]) -> bool:
        """Apply bridging content to reconcile contradictions"""
        # Provide content that links seemingly disparate beliefs
        return True

    def monitor_user_resilience(self, user_id: str, baseline: Dict[str, Any], current_state: Dict[str, Any]) -> Dict[str, Any]:
        """Monitor and measure changes in user resilience to misinformation"""
        # Compare baseline dissonance profile with current state
        resilience_score = 0.5  # Placeholder calculation

        return {
            "resilience_score": resilience_score,
            "change_in_resilience": 0.0,
            "contributing_factors": [],
            "recommendations": []
        }


# Convenience function for easy integration
def create_cognitive_dissonance_system() -> CognitiveDissonanceMitigationSystem:
    """
    Factory function to create and initialize the cognitive dissonance mitigation system
    """
    return CognitiveDissonanceMitigationSystem()
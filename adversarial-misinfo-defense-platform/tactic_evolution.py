"""
Autonomous Tactic Evolution for Adversarial Misinformation Defense Platform

This module implements autonomous evolution of detection tactics based on observed
adversarial patterns and threat actor behaviors.
"""
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import random
import json
import logging
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
from collections import defaultdict


class TacticType(Enum):
    """
    Types of tactics used by threat actors
    """
    SOCIAL_ENGINEERING = "social_engineering"
    DEEPFAKE_GENERATION = "deepfake_generation"
    MEME_MANIPULATION = "meme_manipulation"
    NARRATIVE_SPREADING = "narrative_spreading"
    COORDINATION_CAMPAIGN = "coordination_campaign"
    BOT_AMPLIFICATION = "bot_amplification"
    HASHTAG_HIJACKING = "hashtag_hijacking"
    ACCOUNT_IMPERSONATION = "account_impersonation"


class EvolutionStrategy(Enum):
    """
    Strategies for tactic evolution
    """
    MUTATION = "mutation"
    COMBINATION = "combination"
    ADAPTATION = "adaptation"
    SPECIALIZATION = "specialization"
    GENERALIZATION = "generalization"


@dataclass
class ThreatActorProfile:
    """
    Profile of a threat actor or group
    """
    actor_id: str
    name: str
    tactics: List[TacticType]
    sophistication_level: float  # 0.0 to 1.0
    adaptation_rate: float  # How quickly they adapt to defenses
    success_history: List[float]  # Historical success rates
    last_seen: datetime
    associated_accounts: List[str]
    geographic_focus: List[str]
    target_demographics: List[str]


@dataclass
class Tactic:
    """
    Individual tactic used in misinformation campaigns
    """
    tactic_id: str
    type: TacticType
    description: str
    effectiveness_score: float  # 0.0 to 1.0
    detection_resistance: float  # 0.0 to 1.0
    resource_requirements: Dict[str, float]  # Resources needed (time, money, etc.)
    success_patterns: List[str]  # Patterns that indicate success
    failure_indicators: List[str]  # Patterns that indicate failure
    variants: List[str]  # Known variants of this tactic
    last_updated: datetime
    associated_actors: List[str]  # Actor IDs that use this tactic


@dataclass
class TacticEvolutionRecord:
    """
    Record of tactic evolution events
    """
    evolution_id: str
    parent_tactic_id: str
    evolved_tactic_id: str
    evolution_strategy: EvolutionStrategy
    mutation_factors: Dict[str, float]  # Factors that influenced evolution
    success_probability: float  # Estimated success of evolved tactic
    timestamp: datetime
    associated_actor: Optional[str]


class AutonomousTacticEvolver:
    """
    Engine for autonomous evolution of threat tactics
    """
    
    def __init__(self):
        """
        Initialize the tactic evolver
        """
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        
        # Store threat actor profiles and tactics
        self.threat_actors: Dict[str, ThreatActorProfile] = {}
        self.tactics: Dict[str, Tactic] = {}
        self.evolution_records: List[TacticEvolutionRecord] = []
        
        # Evolution parameters
        self.mutation_rate = 0.1  # Probability of mutation per update cycle
        self.combination_rate = 0.05  # Probability of combining tactics
        self.adaptation_threshold = 0.3  # Threshold for triggering adaptation
        
        # Initialize with some basic tactics
        self._initialize_basic_tactics()
        
        # Initialize with some basic threat actors
        self._initialize_basic_actors()
    
    def _initialize_basic_tactics(self):
        """
        Initialize with basic tactics commonly seen in misinformation campaigns
        """
        basic_tactics = [
            Tactic(
                tactic_id=str(uuid.uuid4()),
                type=TacticType.SOCIAL_ENGINEERING,
                description="Exploiting psychological biases to manipulate beliefs",
                effectiveness_score=0.75,
                detection_resistance=0.6,
                resource_requirements={"time": 0.5, "money": 0.3},
                success_patterns=["emotional language", "urgency triggers", "authority appeals"],
                failure_indicators=["fact-checking", "source verification"],
                variants=["clickbait headlines", "false urgency", "false authority"],
                last_updated=datetime.now(),
                associated_actors=[]
            ),
            Tactic(
                tactic_id=str(uuid.uuid4()),
                type=TacticType.MEME_MANIPULATION,
                description="Creating and spreading manipulated memes to spread misinformation",
                effectiveness_score=0.8,
                detection_resistance=0.65,
                resource_requirements={"time": 0.3, "design_skills": 0.4},
                success_patterns=["humor", "relatability", "shareability"],
                failure_indicators=["meme fatigue", "pattern recognition"],
                variants=["image macros", "video memes", "remix culture"],
                last_updated=datetime.now(),
                associated_actors=[]
            )
        ]
        
        for tactic in basic_tactics:
            self.tactics[tactic.tactic_id] = tactic
    
    def _initialize_basic_actors(self):
        """
        Initialize with basic threat actor profiles
        """
        basic_actors = [
            ThreatActorProfile(
                actor_id=str(uuid.uuid4()),
                name="Generic Misinformation Group",
                tactics=[TacticType.SOCIAL_ENGINEERING, TacticType.MEME_MANIPULATION],
                sophistication_level=0.6,
                adaptation_rate=0.4,
                success_history=[0.7, 0.65, 0.72, 0.68],
                last_seen=datetime.now(),
                associated_accounts=["account1", "account2", "account3"],
                geographic_focus=["US", "EU"],
                target_demographics=["young_adults", "politically_active"]
            )
        ]
        
        for actor in basic_actors:
            self.threat_actors[actor.actor_id] = actor
    
    def register_threat_actor(self, actor_profile: ThreatActorProfile):
        """
        Register a new threat actor profile
        """
        self.threat_actors[actor_profile.actor_id] = actor_profile
        self.logger.info(f"Registered threat actor: {actor_profile.name}")
    
    def register_tactic(self, tactic: Tactic):
        """
        Register a new tactic
        """
        self.tactics[tactic.tactic_id] = tactic
        self.logger.info(f"Registered tactic: {tactic.description}")
    
    def update_actor_behavior(self, actor_id: str, new_tactics: List[TacticType], 
                            success_rate: float):
        """
        Update threat actor behavior based on observed activities
        """
        if actor_id in self.threat_actors:
            actor = self.threat_actors[actor_id]
            
            # Update tactics
            actor.tactics = new_tactics
            
            # Update success history
            actor.success_history.append(success_rate)
            
            # Limit success history to last 20 entries
            if len(actor.success_history) > 20:
                actor.success_history = actor.success_history[-20:]
            
            # Update last seen timestamp
            actor.last_seen = datetime.now()
            
            self.logger.info(f"Updated behavior for actor {actor.name}")
        else:
            self.logger.warning(f"Unknown actor ID: {actor_id}")
    
    def evolve_tactics_based_on_detection_rates(self, 
                                               detection_performance: Dict[str, float]):
        """
        Evolve tactics based on current detection performance
        """
        self.logger.info("Starting tactic evolution based on detection rates")
        
        # Track evolved tactics
        evolved_tactics = []
        
        # For each tactic with poor detection performance, consider evolution
        for tactic_id, detection_rate in detection_performance.items():
            if tactic_id in self.tactics:
                tactic = self.tactics[tactic_id]
                
                # If detection rate is high (meaning detection is working well), 
                # the tactic needs to evolve
                if detection_rate > (1.0 - self.adaptation_threshold):
                    # Increase detection resistance of this tactic
                    tactic.detection_resistance = min(1.0, 
                        tactic.detection_resistance + random.uniform(0.05, 0.15))
                    
                    # Potentially evolve the tactic
                    if random.random() < self.mutation_rate:
                        evolved_tactic = self._mutate_tactic(tactic)
                        if evolved_tactic:
                            evolved_tactics.append(evolved_tactic)
                            
                            # Record evolution
                            evolution_record = TacticEvolutionRecord(
                                evolution_id=str(uuid.uuid4()),
                                parent_tactic_id=tactic.tactic_id,
                                evolved_tactic_id=evolved_tactic.tactic_id,
                                evolution_strategy=EvolutionStrategy.MUTATION,
                                mutation_factors={
                                    "detection_pressure": detection_rate,
                                    "resource_availability": 0.5,
                                    "innovation_capacity": 0.7
                                },
                                success_probability=self._estimate_success_probability(
                                    evolved_tactic),
                                timestamp=datetime.now(),
                                associated_actor=None
                            )
                            self.evolution_records.append(evolution_record)
                    
                    # Potentially combine with another tactic
                    if random.random() < self.combination_rate:
                        other_tactic = self._select_random_tactic(exclude_tactic_id=tactic_id)
                        if other_tactic:
                            combined_tactic = self._combine_tactics(tactic, other_tactic)
                            if combined_tactic:
                                evolved_tactics.append(combined_tactic)
                                
                                # Record evolution
                                evolution_record = TacticEvolutionRecord(
                                    evolution_id=str(uuid.uuid4()),
                                    parent_tactic_id=f"{tactic.tactic_id},{other_tactic.tactic_id}",
                                    evolved_tactic_id=combined_tactic.tactic_id,
                                    evolution_strategy=EvolutionStrategy.COMBINATION,
                                    mutation_factors={
                                        "synergy_potential": 0.8,
                                        "resource_efficiency": 0.6
                                    },
                                    success_probability=self._estimate_success_probability(
                                        combined_tactic),
                                    timestamp=datetime.now(),
                                    associated_actor=None
                                )
                                self.evolution_records.append(evolution_record)
        
        self.logger.info(f"Evolved {len(evolved_tactics)} tactics based on detection pressure")
        return evolved_tactics
    
    def _mutate_tactic(self, original_tactic: Tactic) -> Optional[Tactic]:
        """
        Create a mutated version of a tactic
        """
        try:
            # Create a copy of the original tactic
            mutated_tactic = Tactic(
                tactic_id=str(uuid.uuid4()),
                type=original_tactic.type,
                description=original_tactic.description,
                effectiveness_score=original_tactic.effectiveness_score,
                detection_resistance=original_tactic.detection_resistance,
                resource_requirements=original_tactic.resource_requirements.copy(),
                success_patterns=original_tactic.success_patterns.copy(),
                failure_indicators=original_tactic.failure_indicators.copy(),
                variants=original_tactic.variants.copy(),
                last_updated=datetime.now(),
                associated_actors=original_tactic.associated_actors.copy()
            )
            
            # Apply mutations
            # 1. Increase detection resistance
            resistance_increase = random.uniform(0.1, 0.3)
            mutated_tactic.detection_resistance = min(1.0, 
                mutated_tactic.detection_resistance + resistance_increase)
            
            # 2. Modify description to reflect evolution
            mutation_type = random.choice(["stealth", "speed", "scale", "novelty"])
            mutated_tactic.description = f"{original_tactic.description} (evolved - {mutation_type})"
            
            # 3. Add new variant
            new_variant = f"evolved_{mutation_type}_{len(mutated_tactic.variants) + 1}"
            mutated_tactic.variants.append(new_variant)
            
            # 4. Potentially modify resource requirements
            if random.random() < 0.3:
                resource_keys = list(mutated_tactic.resource_requirements.keys())
                if resource_keys:
                    resource_key = random.choice(resource_keys)
                    change_factor = random.uniform(0.8, 1.2)
                    mutated_tactic.resource_requirements[resource_key] = min(1.0, 
                        mutated_tactic.resource_requirements[resource_key] * change_factor)
            
            # Register the mutated tactic
            self.tactics[mutated_tactic.tactic_id] = mutated_tactic
            
            self.logger.info(f"Created mutated tactic: {mutated_tactic.description}")
            return mutated_tactic
            
        except Exception as e:
            self.logger.error(f"Error mutating tactic: {str(e)}")
            return None
    
    def _select_random_tactic(self, exclude_tactic_id: Optional[str] = None) -> Optional[Tactic]:
        """
        Select a random tactic, optionally excluding one
        """
        available_tactics = [
            tactic for tactic_id, tactic in self.tactics.items()
            if exclude_tactic_id is None or tactic_id != exclude_tactic_id
        ]
        
        if available_tactics:
            return random.choice(available_tactics)
        else:
            return None
    
    def _combine_tactics(self, tactic1: Tactic, tactic2: Tactic) -> Optional[Tactic]:
        """
        Combine two tactics to create a new hybrid tactic
        """
        try:
            # Create hybrid tactic combining elements from both
            hybrid_tactic = Tactic(
                tactic_id=str(uuid.uuid4()),
                type=random.choice([tactic1.type, tactic2.type]),
                description=f"Hybrid: {tactic1.description} + {tactic2.description}",
                effectiveness_score=min(1.0, (tactic1.effectiveness_score + tactic2.effectiveness_score) / 2),
                detection_resistance=min(1.0, max(tactic1.detection_resistance, tactic2.detection_resistance)),
                resource_requirements={},
                success_patterns=list(set(tactic1.success_patterns + tactic2.success_patterns)),
                failure_indicators=list(set(tactic1.failure_indicators + tactic2.failure_indicators)),
                variants=list(set(tactic1.variants + tactic2.variants)),
                last_updated=datetime.now(),
                associated_actors=list(set(tactic1.associated_actors + tactic2.associated_actors))
            )
            
            # Combine resource requirements
            all_resources = set(list(tactic1.resource_requirements.keys()) + 
                              list(tactic2.resource_requirements.keys()))
            for resource in all_resources:
                val1 = tactic1.resource_requirements.get(resource, 0.0)
                val2 = tactic2.resource_requirements.get(resource, 0.0)
                hybrid_tactic.resource_requirements[resource] = min(1.0, (val1 + val2) / 2)
            
            # Register the hybrid tactic
            self.tactics[hybrid_tactic.tactic_id] = hybrid_tactic
            
            self.logger.info(f"Created hybrid tactic: {hybrid_tactic.description}")
            return hybrid_tactic
            
        except Exception as e:
            self.logger.error(f"Error combining tactics: {str(e)}")
            return None
    
    def _estimate_success_probability(self, tactic: Tactic) -> float:
        """
        Estimate the success probability of a tactic
        """
        # Simple estimation based on effectiveness and detection resistance
        return min(1.0, (tactic.effectiveness_score + (1.0 - tactic.detection_resistance)) / 2)
    
    def predict_future_tactics(self, actor_id: str, prediction_horizon: int = 5) -> List[Tactic]:
        """
        Predict future tactics that an actor might evolve toward
        """
        if actor_id not in self.threat_actors:
            self.logger.warning(f"Unknown actor ID: {actor_id}")
            return []
        
        actor = self.threat_actors[actor_id]
        predicted_tactics = []
        
        # Get current tactics of the actor
        current_tactics = [
            self.tactics[tactic_id] for tactic_id in 
            [t.tactic_id for t in self.tactics.values() if t.tactic_id in [str(t) for t in actor.tactics]]
        ]
        
        # Generate predictions based on current trends
        for _ in range(prediction_horizon):
            # Randomly select prediction method
            prediction_method = random.choice([
                "mutation", "combination", "adaptation"
            ])
            
            if prediction_method == "mutation" and current_tactics:
                # Mutate a random current tactic
                base_tactic = random.choice(current_tactics)
                mutated_tactic = self._mutate_tactic(base_tactic)
                if mutated_tactic:
                    predicted_tactics.append(mutated_tactic)
                    current_tactics.append(mutated_tactic)  # For potential further evolution
                    
            elif prediction_method == "combination" and len(current_tactics) >= 2:
                # Combine two random current tactics
                tactic1, tactic2 = random.sample(current_tactics, 2)
                combined_tactic = self._combine_tactics(tactic1, tactic2)
                if combined_tactic:
                    predicted_tactics.append(combined_tactic)
                    current_tactics.append(combined_tactic)  # For potential further evolution
                    
            elif prediction_method == "adaptation":
                # Adapt based on actor's sophistication and adaptation rate
                if random.random() < actor.adaptation_rate:
                    # Create a new tactic adapted to current environment
                    new_tactic = self._create_adapted_tactic(actor)
                    if new_tactic:
                        predicted_tactics.append(new_tactic)
                        current_tactics.append(new_tactic)
        
        self.logger.info(f"Predicted {len(predicted_tactics)} future tactics for actor {actor.name}")
        return predicted_tactics
    
    def _create_adapted_tactic(self, actor: ThreatActorProfile) -> Optional[Tactic]:
        """
        Create a new tactic adapted to the actor's profile
        """
        try:
            # Create an adapted tactic based on actor characteristics
            tactic_type = random.choice(list(TacticType))
            
            adapted_tactic = Tactic(
                tactic_id=str(uuid.uuid4()),
                type=tactic_type,
                description=f"Adapted tactic for {actor.name} ({tactic_type.value})",
                effectiveness_score=min(1.0, actor.sophistication_level + random.uniform(-0.1, 0.1)),
                detection_resistance=min(1.0, actor.adaptation_rate + random.uniform(-0.1, 0.1)),
                resource_requirements={"adaptation_factor": actor.sophistication_level},
                success_patterns=[f"adapted_to_{actor.name.lower().replace(' ', '_')}"],
                failure_indicators=[],
                variants=[f"actor_specific_{len(self.tactics) + 1}"],
                last_updated=datetime.now(),
                associated_actors=[actor.actor_id]
            )
            
            # Register the adapted tactic
            self.tactics[adapted_tactic.tactic_id] = adapted_tactic
            
            self.logger.info(f"Created adapted tactic for actor {actor.name}")
            return adapted_tactic
            
        except Exception as e:
            self.logger.error(f"Error creating adapted tactic: {str(e)}")
            return None
    
    def update_tactic_effectiveness(self, tactic_id: str, new_effectiveness: float):
        """
        Update the effectiveness score of a tactic based on real-world observations
        """
        if tactic_id in self.tactics:
            tactic = self.tactics[tactic_id]
            tactic.effectiveness_score = new_effectiveness
            tactic.last_updated = datetime.now()
            self.logger.info(f"Updated effectiveness of tactic {tactic_id} to {new_effectiveness}")
        else:
            self.logger.warning(f"Tactic ID {tactic_id} not found")
    
    def get_threat_actor_report(self, actor_id: str) -> Dict[str, Any]:
        """
        Generate a comprehensive report on a threat actor
        """
        if actor_id not in self.threat_actors:
            return {"error": f"Actor ID {actor_id} not found"}
        
        actor = self.threat_actors[actor_id]
        
        # Get actor's tactics
        actor_tactics = [
            self.tactics[tactic_id] for tactic_id in 
            [t.tactic_id for t in self.tactics.values() if t.tactic_id in [str(t) for t in actor.tactics]]
        ]
        
        # Calculate average effectiveness and detection resistance
        avg_effectiveness = np.mean([t.effectiveness_score for t in actor_tactics]) if actor_tactics else 0.0
        avg_detection_resistance = np.mean([t.detection_resistance for t in actor_tactics]) if actor_tactics else 0.0
        
        report = {
            "actor_profile": asdict(actor),
            "tactics_count": len(actor_tactics),
            "average_effectiveness": avg_effectiveness,
            "average_detection_resistance": avg_detection_resistance,
            "recent_success_rate": np.mean(actor.success_history[-5:]) if actor.success_history else 0.0,
            "predicted_evolution_tactics": len(self.predict_future_tactics(actor_id, 3)),
            "report_timestamp": datetime.now().isoformat()
        }
        
        return report
    
    def get_all_evolution_records(self) -> List[Dict[str, Any]]:
        """
        Get all tactic evolution records
        """
        return [asdict(record) for record in self.evolution_records]
    
    def save_evolution_data(self, filepath: str):
        """
        Save evolution data to file
        """
        try:
            data = {
                "threat_actors": {k: asdict(v) for k, v in self.threat_actors.items()},
                "tactics": {k: asdict(v) for k, v in self.tactics.items()},
                "evolution_records": [asdict(record) for record in self.evolution_records]
            }
            
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            
            self.logger.info(f"Saved evolution data to {filepath}")
        except Exception as e:
            self.logger.error(f"Error saving evolution data: {str(e)}")
    
    def load_evolution_data(self, filepath: str):
        """
        Load evolution data from file
        """
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            # Restore threat actors
            self.threat_actors = {
                k: ThreatActorProfile(**v) for k, v in data["threat_actors"].items()
            }
            
            # Restore tactics
            self.tactics = {
                k: Tactic(**v) for k, v in data["tactics"].items()
            }
            
            # Restore evolution records
            self.evolution_records = [
                TacticEvolutionRecord(**record) for record in data["evolution_records"]
            ]
            
            self.logger.info(f"Loaded evolution data from {filepath}")
        except Exception as e:
            self.logger.error(f"Error loading evolution data: {str(e)}")


# Convenience function for easy usage
def create_tactic_evolver() -> AutonomousTacticEvolver:
    """
    Factory function to create and initialize the tactic evolver
    """
    return AutonomousTacticEvolver()
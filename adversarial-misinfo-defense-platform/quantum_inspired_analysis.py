"""
Quantum-Inspired Information Entanglement Detection Module for Adversarial Misinformation Defense Platform

This module implements revolutionary quantum-inspired algorithms to detect and analyze
information entanglement patterns that mimic quantum mechanics phenomena in social
and information networks, creating unprecedented insights into misinformation spread.
"""

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any, Union
from collections import defaultdict
import numpy as np
from numpy.linalg import norm
import math
from datetime import datetime, timedelta
from scipy.stats import vonmises


class QuantumStateType(Enum):
    """Types of quantum-inspired information states"""
    SUPERPOSITION = "superposition"     # Information in multiple possible states
    ENTANGLED = "entangled"            # Information correlated with other content
    COLLAPSED = "collapsed"            # Information in definite state (confirmed/dismissed)
    COHERENT = "coherent"             # Information maintaining quantum properties
    DECOHERED = "decohered"           # Information lost quantum properties


class EntanglementStrength(Enum):
    """Levels of quantum-inspired information entanglement"""
    WEAK = 0.1
    MODERATE = 0.4
    STRONG = 0.7
    MAXIMAL = 1.0


@dataclass
class QuantumInformationState:
    """Represents information in a quantum-inspired superposition state"""
    info_id: str
    content: str
    amplitude: complex  # Complex probability amplitude
    phase: float       # Phase angle (0 to 2π)
    coherence_time: datetime  # When state remains quantum-coherent
    entangled_with: List[str] = field(default_factory=list)
    probability: float = 0.0  # |amplitude|^2
    state_type: QuantumStateType = QuantumStateType.SUPERPOSITION
    measurement_history: List[Tuple[datetime, str, float]] = field(default_factory=list)
    quantum_fidelity: float = 1.0  # Quantum information fidelity (0.0 to 1.0)


@dataclass
class EntanglementLink:
    """Represents quantum-inspired entanglement between information pieces"""
    link_id: str
    info1_id: str
    info2_id: str
    entanglement_strength: float
    phase_correlation: float  # Phase relationship between entangled info
    mutual_information: float  # Classical mutual information
    quantum_mutual_information: float  # Quantum mutual information
    created_at: datetime
    persists_until: datetime
    entanglement_type: str  # "semantic", "emotional", "temporal", "network"


@dataclass
class QuantumInterferencePattern:
    """Describes interference patterns in information propagation"""
    info_ids: List[str]
    interference_type: str  # "constructive", "destructive", "mixed"
    interference_strength: float
    temporal_alignment: float  # How synchronized in time
    spatial_alignment: float   # How connected in network space
    resulting_probability_amplification: float
    timestamp: datetime


class QuantumInformationNetwork:
    """Models information propagation using quantum-inspired mechanics"""

    def __init__(self):
        self.states: Dict[str, QuantumInformationState] = {}
        self.entanglements: Dict[str, EntanglementLink] = {}
        self.interference_patterns: List[QuantumInterferencePattern] = []
        self.quantum_gate_operations: List[Tuple[str, str, datetime]] = []  # info_id, gate_type, time
        self.coherence_decay_rates: Dict[str, float] = {}  # Rate of quantum property decay
        self.network_density: float = 0.0  # Network connection density affecting quantum properties
        self.global_coherence_factor: float = 1.0  # Overall quantum coherence in network

    def add_quantum_state(self, quantum_state: QuantumInformationState):
        """Add a quantum-inspired information state to the network"""
        if quantum_state.state_type == QuantumStateType.SUPERPOSITION:
            # Calculate probability from amplitude
            quantum_state.probability = abs(quantum_state.amplitude)**2

        self.states[quantum_state.info_id] = quantum_state
        self.coherence_decay_rates[quantum_state.info_id] = 0.01  # Default slow decay

    def create_entanglement(self, info1_id: str, info2_id: str, strength: float) -> str:
        """Create quantum-inspired entanglement between two information pieces"""
        if info1_id not in self.states or info2_id not in self.states:
            raise ValueError("Both information pieces must exist in network")

        entanglement_id = f"ent_{info1_id}_{info2_id}_{datetime.now().timestamp()}"

        # Calculate phase correlation
        phase1 = self.states[info1_id].phase
        phase2 = self.states[info2_id].phase
        phase_correlation = math.cos(abs(phase1 - phase2))

        # Calculate mutual information (simplified)
        content1_tokens = set(self.states[info1_id].content.lower().split())
        content2_tokens = set(self.states[info2_id].content.lower().split())
        intersection = content1_tokens.intersection(content2_tokens)
        union = content1_tokens.union(content2_tokens)
        mutual_info = len(intersection) / len(union) if union else 0.0

        # Quantum mutual information approximation
        quantum_mi = strength * (1 + phase_correlation) / 2

        entanglement = EntanglementLink(
            link_id=entanglement_id,
            info1_id=info1_id,
            info2_id=info2_id,
            entanglement_strength=min(strength, 1.0),
            phase_correlation=phase_correlation,
            mutual_information=mutual_info,
            quantum_mutual_information=quantum_mi,
            created_at=datetime.now(),
            persists_until=datetime.now() + timedelta(hours=24 * 30),  # 30 days by default
            entanglement_type=self._classify_entanglement_type(info1_id, info2_id)
        )

        self.entanglements[entanglement_id] = entanglement

        # Update states to reflect entanglement
        self.states[info1_id].entangled_with.append(info2_id)
        self.states[info2_id].entangled_with.append(info1_id)

        # Log the entanglement creation
        self.states[info1_id].measurement_history.append(
            (datetime.now(), f"ENTANGLED_WITH_{info2_id}", strength)
        )
        self.states[info2_id].measurement_history.append(
            (datetime.now(), f"ENTANGLED_WITH_{info1_id}", strength)
        )

        return entanglement_id

    def _classify_entanglement_type(self, info1_id: str, info2_id: str) -> str:
        """Classify the type of entanglement"""
        content1 = self.states[info1_id].content.lower()
        content2 = self.states[info2_id].content.lower()

        # Check for different types of relationships
        if any(word in content1 and word in content2 for word in
               ['cause', 'effect', 'because', 'therefore', 'leads', 'results']):
            return "semantic"
        elif any(emotion in content1 or emotion in content2 for emotion in
                 ['fear', 'anger', 'anxiety', 'happiness', 'hope', 'love']):
            return "emotional"
        elif any(temporal_word in content1 or temporal_word in content2 for temporal_word in
                 ['before', 'after', 'during', 'while', 'then', 'previously', 'later']):
            return "temporal"
        else:
            return "network"  # Just network adjacency

    def apply_quantum_gate(self, info_id: str, gate_type: str):
        """Apply a quantum gate operation to transform an information state"""
        if info_id not in self.states:
            return

        state = self.states[info_id]

        # Apply different transformations based on gate type
        if gate_type == "hadamard":
            # Hadamard gate: creates superposition
            old_amp = state.amplitude
            state.amplitude = (old_amp + 1j * old_amp) / math.sqrt(2)
            state.phase = state.phase + math.pi / 4
        elif gate_type == "pauli_x":
            # Pauli-X gate: bit flip equivalent
            state.amplitude = -state.amplitude
            state.phase = state.phase + math.pi
        elif gate_type == "pauli_y":
            # Pauli-Y gate
            state.amplitude = 1j * state.amplitude
            state.phase = state.phase + math.pi / 2
        elif gate_type == "phase_shift":
            # Phase shift gate
            state.phase = (state.phase + math.pi / 8) % (2 * math.pi)
            state.amplitude = abs(state.amplitude) * cmath.rect(1, state.phase)

        # Update probability
        state.probability = abs(state.amplitude)**2

        # Record the operation
        self.quantum_gate_operations.append((info_id, gate_type, datetime.now()))
        state.measurement_history.append((datetime.now(), f"QUANTUM_GATE_{gate_type}", 1.0))

    def detect_quantum_interference(self, info_ids: List[str]) -> Optional[QuantumInterferencePattern]:
        """Detect quantum-like interference between multiple information pieces"""
        if len(info_ids) < 2:
            return None

        # Calculate interference based on phase relationships
        phases = [self.states[id].phase for id in info_ids if id in self.states]
        amplitudes = [self.states[id].amplitude for id in info_ids if id in self.states]

        if len(phases) < 2:
            return None

        # Calculate resulting amplitude from interference
        total_amplitude = sum(amplitudes)
        resulting_prob = abs(total_amplitude)**2

        # Calculate interference strength
        # In quantum mechanics, interference occurs when waves combine
        # Constructive interference: amplifies probability
        # Destructive interference: reduces probability
        individual_probs = [abs(a)**2 for a in amplitudes]
        classical_sum = sum(individual_probs)

        if classical_sum > 0:
            interference_strength = (resulting_prob - classical_sum) / classical_sum
        else:
            interference_strength = 0.0

        # Classify interference type
        if interference_strength > 0.1:
            interference_type = "constructive"
        elif interference_strength < -0.1:
            interference_type = "destructive"
        else:
            interference_type = "mixed"

        # Calculate alignment measures
        phase_diffs = [abs(phases[i] - phases[0]) for i in range(1, len(phases))]
        temporal_alignment = self._calculate_temporal_alignment(info_ids)
        spatial_alignment = self._calculate_spatial_alignment(info_ids)

        pattern = QuantumInterferencePattern(
            info_ids=info_ids,
            interference_type=interference_type,
            interference_strength=abs(interference_strength),
            temporal_alignment=temporal_alignment,
            spatial_alignment=spatial_alignment,
            resulting_probability_amplification=max(0, interference_strength),  # Only positive amplification
            timestamp=datetime.now()
        )

        self.interference_patterns.append(pattern)
        return pattern

    def _calculate_temporal_alignment(self, info_ids: List[str]) -> float:
        """Calculate how temporally aligned the information pieces are"""
        if len(info_ids) < 2:
            return 1.0

        timestamps = []
        for info_id in info_ids:
            if info_id in self.states:
                timestamps.append(self.states[info_id].coherence_time)

        if len(timestamps) < 2:
            return 1.0

        # Calculate time differences
        time_diffs = [
            abs((timestamps[i] - timestamps[i-1]).total_seconds())
            for i in range(1, len(timestamps))
        ]

        if not time_diffs:
            return 1.0

        # Normalize by average difference (lower avg diff = better alignment)
        avg_diff = sum(time_diffs) / len(time_diffs)
        # Return inverse relationship (closer in time = higher alignment)
        return 1.0 / (1.0 + avg_diff / 3600)  # Normalize by hour

    def _calculate_spatial_alignment(self, info_ids: List[str]) -> float:
        """Calculate how network-wise aligned the information pieces are"""
        # This would typically connect to network topology analysis
        # For now, use entanglement as proxy for spatial alignment
        total_connections = 0
        possible_connections = 0

        for i, id1 in enumerate(info_ids):
            for j, id2 in enumerate(info_ids):
                if i != j:
                    possible_connections += 1
                    # Check if they're entangled
                    entanglement_exists = any(
                        (ent.info1_id == id1 and ent.info2_id == id2) or
                        (ent.info1_id == id2 and ent.info2_id == id1)
                        for ent in self.entanglements.values()
                    )
                    if entanglement_exists:
                        total_connections += 1

        if possible_connections == 0:
            return 1.0

        return total_connections / possible_connections

    def collapse_state(self, info_id: str, measurement_result: str) -> QuantumInformationState:
        """Collapse quantum information state to classical state through measurement"""
        if info_id not in self.states:
            raise ValueError(f"Information state {info_id} not found")

        state = self.states[info_id]

        # Log the measurement
        state.measurement_history.append(
            (datetime.now(), f"MEASURED_AS_{measurement_result}", 1.0)
        )

        # Collapse to classical state
        state.state_type = QuantumStateType.COLLAPSED
        state.probability = 1.0 if measurement_result == "TRUE" else 0.0
        state.amplitude = 1.0 if measurement_result == "TRUE" else 0.0
        state.coherence_time = datetime.now()  # Record collapse time

        # Propagate collapse to entangled states (quantum effect)
        self._propagate_collapse(info_id)

        return state

    def _propagate_collapse(self, collapsed_id: str):
        """Propagate collapse effect to entangled information states"""
        state = self.states[collapsed_id]

        for entangled_id in state.entangled_with:
            if entangled_id in self.states:
                entangled_state = self.states[entangled_id]

                # Apply collapse influence based on entanglement strength
                entanglement_link = self._find_entanglement(collapsed_id, entangled_id)
                if entanglement_link:
                    influence = entanglement_link.entanglement_strength
                    entangled_state.quantum_fidelity *= (1 - influence * 0.3)  # Reduce coherence

                    # Possibly collapse the entangled state too if strong enough
                    if influence > 0.8 and np.random.random() < influence:
                        entangled_state.state_type = QuantumStateType.COLLAPSED
                        entangled_state.measurement_history.append(
                            (datetime.now(), f"COLLAPSED_VIA_ENTANGLEMENT_WITH_{collapsed_id}", influence)
                        )

    def _find_entanglement(self, id1: str, id2: str) -> Optional[EntanglementLink]:
        """Find entanglement link between two information pieces"""
        for link in self.entanglements.values():
            if (link.info1_id == id1 and link.info2_id == id2) or \
               (link.info1_id == id2 and link.info2_id == id1):
                return link
        return None

    def calculate_coherence_decay(self, info_id: str, elapsed_time_hours: float) -> float:
        """Calculate quantum coherence decay for an information state"""
        base_rate = self.coherence_decay_rates.get(info_id, 0.01)
        global_factor = self.global_coherence_factor

        # Exponential decay: coherence decreases over time
        remaining_coherence = math.exp(-base_rate * elapsed_time_hours) * global_factor
        return max(0.0, min(1.0, remaining_coherence))

    def detect_misinformation_signatures(self) -> Dict[str, Any]:
        """Detect quantum-inspired signatures of misinformation propagation"""
        signatures = {
            "high_entanglement_clusters": [],
            "quantum_interference_events": [],
            "coherence_anomalies": [],
            "non_local_correlations": []  # Information appearing simultaneously in unconnected places
        }

        # Detect clusters of highly entangled information
        entanglement_graph = defaultdict(list)
        for ent in self.entanglements.values():
            entanglement_graph[ent.info1_id].append((ent.info2_id, ent.entanglement_strength))
            entanglement_graph[ent.info2_id].append((ent.info1_id, ent.entanglement_strength))

        # Find dense subgraphs (potential misinformation clusters)
        for info_id, connections in entanglement_graph.items():
            if len(connections) > 5:  # Highly connected nodes
                total_strength = sum(strength for _, strength in connections)
                if total_strength > 3.0:  # High total entanglement
                    signatures["high_entanglement_clusters"].append({
                        "center_info": info_id,
                        "connection_count": len(connections),
                        "total_entanglement": total_strength
                    })

        # Analyze interference patterns
        for pattern in self.interference_patterns:
            if pattern.interference_strength > 0.5:  # Significant interference
                signatures["quantum_interference_events"].append({
                    "info_set": pattern.info_ids,
                    "type": pattern.interference_type,
                    "strength": pattern.interference_strength
                })

        # Detect coherence anomalies (information staying quantum too long)
        for info_id, state in self.states.items():
            if state.state_type == QuantumStateType.SUPERPOSITION:
                time_in_superposition = (datetime.now() - state.coherence_time).total_seconds() / 3600
                expected_decay = self.calculate_coherence_decay(info_id, time_in_superposition)

                if expected_decay < 0.1 and state.quantum_fidelity > 0.5:
                    # Information is defying expected decoherence - possible misinformation signature
                    signatures["coherence_anomalies"].append({
                        "info_id": info_id,
                        "time_in_superposition_hours": time_in_superposition,
                        "expected_coherence": expected_decay,
                        "actual_fidelity": state.quantum_fidelity
                    })

        return signatures


class QuantumEntanglementDetector:
    """Main detector for quantum-inspired information entanglement and patterns"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.network = QuantumInformationNetwork()
        self.misinformation_qubits = set()  # IDs of information detected as misinfo
        self.quantum_signature_thresholds = {
            "entanglement_clustering": 0.7,
            "interference_strength": 0.6,
            "coherence_anomaly": 0.8
        }

    def initialize_from_content(self, content_list: List[Tuple[str, str]]) -> List[str]:
        """Initialize quantum network from content list (id, content pairs)"""
        created_ids = []

        for info_id, content in content_list:
            # Create initial quantum state for content
            phase = np.random.uniform(0, 2 * math.pi)  # Random initial phase
            amplitude = complex(np.random.uniform(0.5, 1.0), np.random.uniform(-0.5, 0.5))

            quantum_state = QuantumInformationState(
                info_id=info_id,
                content=content,
                amplitude=amplitude,
                phase=phase,
                coherence_time=datetime.now(),
                probability=abs(amplitude)**2
            )

            self.network.add_quantum_state(quantum_state)
            created_ids.append(info_id)

        return created_ids

    def detect_entanglement_patterns(self, info_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """Detect quantum entanglement patterns in information network"""
        if info_ids is None:
            info_ids = list(self.network.states.keys())

        patterns = {
            "entanglement_matrix": {},
            "strong_entanglements": [],
            "entanglement_clusters": [],
            "quantum_correlations": []
        }

        # Calculate entanglement strengths between all pairs
        for i, id1 in enumerate(info_ids):
            for j, id2 in enumerate(info_ids):
                if i < j:  # Avoid duplicate calculations
                    # Attempt to create entanglement if content is related
                    if self._contents_are_related(id1, id2):
                        strength = self._calculate_semantic_entanglement(id1, id2)
                        self.network.create_entanglement(id1, id2, strength)

        # Extract strong entanglements
        for ent in self.network.entanglements.values():
            if ent.entanglement_strength > 0.5:
                patterns["strong_entanglements"].append({
                    "info1": ent.info1_id,
                    "info2": ent.info2_id,
                    "strength": ent.entanglement_strength,
                    "type": ent.entanglement_type
                })

        # Find entanglement clusters (groups of mutually entangled info)
        patterns["entanglement_clusters"] = self._find_entanglement_clusters()

        return patterns

    def _contents_are_related(self, id1: str, id2: str) -> bool:
        """Check if two content pieces are semantically related"""
        content1 = self.network.states[id1].content.lower()
        content2 = self.network.states[id2].content.lower()

        # Simple heuristic: shared keywords or similar topics
        tokens1 = set(content1.split())
        tokens2 = set(content2.split())

        # Check for significant overlap
        intersection = tokens1.intersection(tokens2)
        if len(intersection) > 2:  # At least 3 shared words
            return True

        # Check for related concepts using keyword families
        topic_keywords = [
            {"science", "study", "research", "scientists", "evidence"},
            {"health", "medical", "doctor", "treatment", "medicine"},
            {"politics", "government", "election", "policy", "law"},
            {"climate", "environment", "weather", "earth", "planet"}
        ]

        for keyword_group in topic_keywords:
            if not tokens1.isdisjoint(keyword_group) and not tokens2.isdisjoint(keyword_group):
                return True

        return False

    def _calculate_semantic_entanglement(self, id1: str, id2: str) -> float:
        """Calculate semantic entanglement strength between two information pieces"""
        content1 = self.network.states[id1].content.lower()
        content2 = self.network.states[id2].content.lower()

        # Calculate semantic similarity using a more sophisticated approach
        # For now, a simplified version based on token overlap and position
        tokens1 = content1.split()
        tokens2 = content2.split()

        # Calculate Jaccard similarity
        set1, set2 = set(tokens1), set(tokens2)
        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))

        jaccard_similarity = intersection / union if union > 0 else 0.0

        # Also consider phase correlation
        phase1 = self.network.states[id1].phase
        phase2 = self.network.states[id2].phase
        phase_correlation = abs(math.cos(abs(phase1 - phase2)))

        # Combine semantic and quantum factors
        entanglement_strength = (jaccard_similarity * 0.7 + phase_correlation * 0.3)

        return min(entanglement_strength, 1.0)

    def _find_entanglement_clusters(self) -> List[Dict[str, Any]]:
        """Find clusters of entangled information using community detection"""
        # Simplified approach: find densely connected subgraphs
        clusters = []

        # Build adjacency graph
        graph = defaultdict(list)
        for ent in self.network.entanglements.values():
            if ent.entanglement_strength > 0.3:  # Only significant entanglements
                graph[ent.info1_id].append(ent.info2_id)
                graph[ent.info2_id].append(ent.info1_id)

        # Find connected components (simplified clustering)
        visited = set()
        for start_node in graph:
            if start_node in visited:
                continue

            # BFS to find cluster
            cluster = []
            queue = [start_node]
            while queue:
                node = queue.pop(0)
                if node not in visited:
                    visited.add(node)
                    cluster.append(node)
                    queue.extend(neighbor for neighbor in graph[node] if neighbor not in visited)

            if len(cluster) > 2:  # Only meaningful clusters
                cluster_info = {
                    "nodes": cluster,
                    "size": len(cluster),
                    "internal_connections": sum(
                        1 for n1 in cluster for n2 in graph[n1] if n2 in cluster
                    ) // 2,  # Each edge counted twice
                    "density": 0.0
                }

                if len(cluster) > 1:
                    max_possible_edges = len(cluster) * (len(cluster) - 1) // 2
                    if max_possible_edges > 0:
                        cluster_info["density"] = cluster_info["internal_connections"] / max_possible_edges

                if cluster_info["density"] > 0.3:  # Dense cluster
                    clusters.append(cluster_info)

        return clusters

    def detect_quantum_interference_signatures(self) -> List[Dict[str, Any]]:
        """Detect quantum interference signatures that may indicate coordinated misinformation"""
        signatures = []

        # Look for sets of 3+ information pieces that interfere
        info_ids = list(self.network.states.keys())

        # Check all combinations of 3 information pieces
        for i in range(len(info_ids)):
            for j in range(i+1, len(info_ids)):
                for k in range(j+1, len(info_ids)):
                    info_triplet = [info_ids[i], info_ids[j], info_ids[k]]

                    # Attempt to detect interference pattern
                    pattern = self.network.detect_quantum_interference(info_triplet)
                    if pattern and pattern.interference_strength > 0.4:
                        signatures.append({
                            "info_set": info_triplet,
                            "interference_type": pattern.interference_type,
                            "strength": pattern.interference_strength,
                            "temporal_alignment": pattern.temporal_alignment,
                            "spatial_alignment": pattern.spatial_alignment
                        })

        return signatures

    def detect_coherence_anomalies(self) -> List[Dict[str, Any]]:
        """Detect anomalies in quantum coherence that may indicate misinformation"""
        anomalies = []

        for info_id, state in self.network.states.items():
            if state.state_type == QuantumStateType.SUPERPOSITION:
                hours_since_creation = (datetime.now() - state.coherence_time).total_seconds() / 3600
                expected_coherence = self.network.calculate_coherence_decay(info_id, hours_since_creation)

                # If actual coherence significantly exceeds expected, it's anomalous
                if state.quantum_fidelity > expected_coherence * 1.5:  # 50% higher than expected
                    anomalies.append({
                        "info_id": info_id,
                        "hours_in_superposition": hours_since_creation,
                        "expected_coherence": expected_coherence,
                        "actual_coherence": state.quantum_fidelity,
                        "anomaly_ratio": state.quantum_fidelity / expected_coherence
                    })

        return anomalies

    def analyze_misinformation_propensity(self, info_id: str) -> Dict[str, float]:
        """Analyze how likely an information piece is to be misinformation using quantum signatures"""
        if info_id not in self.network.states:
            return {"misinfo_propensity": 0.0}

        state = self.network.states[info_id]
        propensity_score = 0.0

        # Factor 1: Entanglement clustering
        # If part of a highly entangled cluster, increased likelihood of misinfo
        entanglement_count = len(state.entangled_with)
        for entangled_id in state.entangled_with:
            entanglement_link = self.network._find_entanglement(info_id, entangled_id)
            if entanglement_link and entanglement_link.entanglement_strength > 0.7:
                propensity_score += 0.1

        # Factor 2: Coherence anomaly
        # Information that stays quantum-coherent unusually long
        hours_in_superposition = (datetime.now() - state.coherence_time).total_seconds() / 3600
        expected_coherence = self.network.calculate_coherence_decay(info_id, hours_in_superposition)
        if state.quantum_fidelity > expected_coherence * 2.0:
            propensity_score += 0.2

        # Factor 3: Phase instability
        # Misinformation often has unstable meaning (phase)
        if len(state.measurement_history) > 5:  # Frequently measured/changing
            # This could indicate instability in meaning/superposition
            propensity_score += 0.15

        # Factor 4: Network position
        # If connected to many other "misinformation" nodes
        misinfo_neighbors = sum(1 for nid in state.entangled_with if nid in self.misinformation_qubits)
        if misinfo_neighbors > 0:
            propensity_score += 0.1 * misinfo_neighbors

        # Cap the score at 1.0
        propensity_score = min(propensity_score, 1.0)

        return {
            "misinfo_propensity": propensity_score,
            "entanglement_factor": min(0.4, entanglement_count * 0.05),
            "coherence_anomaly_factor": max(0.0, (state.quantum_fidelity - expected_coherence) * 0.5),
            "instability_factor": 0.15 if len(state.measurement_history) > 5 else 0.0,
            "network_propagation_factor": min(0.3, misinfo_neighbors * 0.1)
        }

    def simulate_quantum_measurement_attack(self, info_id: str, attack_strength: float) -> Dict[str, Any]:
        """Simulate a quantum measurement attack that attempts to collapse information state"""
        if info_id not in self.network.states:
            return {"success": False, "message": "Info not found"}

        state = self.network.states[info_id]

        # Attack effectiveness depends on entanglement degree and coherence
        entanglement_protection = len(state.entangled_with) * 0.05  # Each connection provides 5% protection
        coherence_protection = state.quantum_fidelity
        attack_success_chance = attack_strength * (1.0 - entanglement_protection) * (1.0 - coherence_protection)

        result = {
            "attack_target": info_id,
            "attack_strength": attack_strength,
            "defensive_factors": {
                "entanglement_protection": entanglement_protection,
                "coherence_protection": coherence_protection
            },
            "success_probability": attack_success_chance,
            "result": "DEFLECTED" if np.random.random() > attack_success_chance else "SUCCESSFUL"
        }

        if result["result"] == "SUCCESSFUL":
            # Collapse the state
            final_state = self.network.collapse_state(info_id, "MEASURED_FALSE")
            result["post_measurement_state"] = {
                "probability": final_state.probability,
                "fidelity": final_state.quantum_fidelity,
                "type": final_state.state_type.value
            }

        return result

    def generate_quantum_informed_prediction(self, info_id: str) -> Dict[str, Any]:
        """Generate predictions about information trajectory using quantum-inspired models"""
        if info_id not in self.network.states:
            return {"prediction": "No data for prediction"}

        state = self.network.states[info_id]

        # Predict based on quantum properties
        predictions = {
            "stability_prediction": "UNSTABLE" if state.quantum_fidelity < 0.3 else "STABLE",
            "entanglement_growth_potential": min(1.0, len(state.entangled_with) * 0.2),
            "coherence_decay_timeline": self._predict_coherence_decay(info_id),
            "measurement_likelihood": self._predict_measurement_likelihood(info_id)
        }

        return predictions

    def _predict_coherence_decay(self, info_id: str) -> str:
        """Predict timeline for coherence decay"""
        state = self.network.states[info_id]
        hours_since_creation = (datetime.now() - state.coherence_time).total_seconds() / 3600
        current_coherence = self.network.calculate_coherence_decay(info_id, hours_since_creation)

        if current_coherence > 0.7:
            return "LONG_TERM_STABLE"
        elif current_coherence > 0.4:
            return "MODERATE_DECAY_EXPECTED"
        else:
            return "RAPID_DECAY_LIKELY"

    def _predict_measurement_likelihood(self, info_id: str) -> float:
        """Predict how likely this information is to be 'measured' (verified/fact-checked)"""
        state = self.network.states[info_id]

        # High entanglement or high probability may trigger measurement
        measurement_likelihood = (
            min(0.5, len(state.entangled_with) * 0.1) +  # Entanglement increases measurement likelihood
            state.probability * 0.3 +  # High probability content gets more attention
            (1.0 - state.quantum_fidelity) * 0.2  # Low fidelity means more uncertainty = more checking
        )

        return min(measurement_likelihood, 1.0)


class QuantumInformationDefenseSystem:
    """Main system combining quantum-inspired analysis with misinformation defense"""

    def __init__(self):
        self.quantum_detector = QuantumEntanglementDetector()
        self.defense_protocols = {
            "quantum_error_correction": self._apply_quantum_error_correction,
            "entanglement_distillation": self._apply_entanglement_distillation,
            "coherence_preservation": self._apply_coherence_preservation,
            "quantum_stealth_encoding": self._apply_quantum_stealth_encoding
        }

    def assess_threat_using_quantum_methods(self, content: str, info_id: str = None) -> Dict[str, Any]:
        """Assess misinformation threat using quantum-inspired methods"""
        if info_id is None:
            info_id = f"info_{datetime.now().timestamp()}"

        # Add to quantum network
        phase = np.random.uniform(0, 2 * math.pi)
        amplitude = complex(np.random.uniform(0.5, 1.0), np.random.uniform(-0.5, 0.5))

        quantum_state = QuantumInformationState(
            info_id=info_id,
            content=content,
            amplitude=amplitude,
            phase=phase,
            coherence_time=datetime.now(),
            probability=abs(amplitude)**2
        )

        self.quantum_detector.network.add_quantum_state(quantum_state)

        # Perform quantum analysis
        entanglement_analysis = self.quantum_detector.detect_entanglement_patterns([info_id])
        misinfo_propensity = self.quantum_detector.analyze_misinformation_propensity(info_id)
        coherence_anomalies = self.quantum_detector.detect_coherence_anomalies()

        # Overall threat assessment
        threat_score = (
            misinfo_propensity["misinfo_propensity"] * 0.5 +
            (1 if any(ca["info_id"] == info_id for ca in coherence_anomalies) else 0) * 0.3 +
            (1 if len(entanglement_analysis["strong_entanglements"]) > 0 else 0) * 0.2
        )

        return {
            "info_id": info_id,
            "threat_score": threat_score,
            "quantum_properties": {
                "entanglement_count": len(quantum_state.entangled_with),
                "coherence_level": quantum_state.quantum_fidelity,
                "probability_amplitude": abs(quantum_state.amplitude),
                "phase_angle": quantum_state.phase
            },
            "misinfo_propensity": misinfo_propensity,
            "entanglement_analysis": entanglement_analysis,
            "recommended_action": self._recommend_action(threat_score)
        }

    def _recommend_action(self, threat_score: float) -> str:
        """Recommend defensive action based on threat score"""
        if threat_score < 0.3:
            return "MONITOR_NORMALLY"
        elif threat_score < 0.6:
            return "INCREASE_SCRUTINY"
        elif threat_score < 0.8:
            return "FLAG_FOR_REVIEW"
        else:
            return "IMMEDIATE_INTERVENTION"

    def apply_quantum_defense_protocol(self, protocol_name: str, target_info_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Apply a quantum-inspired defense protocol"""
        if protocol_name in self.defense_protocols:
            return self.defense_protocols[protocol_name](target_info_id, context)
        else:
            return {"success": False, "message": f"Protocol {protocol_name} not found"}

    def _apply_quantum_error_correction(self, info_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Apply quantum error correction to preserve information integrity"""
        # Enhance quantum fidelity of the information state
        if info_id in self.quantum_detector.network.states:
            state = self.quantum_detector.network.states[info_id]
            state.quantum_fidelity = min(1.0, state.quantum_fidelity + 0.2)

            return {
                "success": True,
                "info_id": info_id,
                "previous_fidelity": state.quantum_fidelity - 0.2,
                "new_fidelity": state.quantum_fidelity,
                "protocol": "QUANTUM_ERROR_CORRECTION"
            }

        return {"success": False, "message": "Info not found", "protocol": "QUANTUM_ERROR_CORRECTION"}

    def _apply_entanglement_distillation(self, info_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Apply entanglement distillation to purify information correlations"""
        # Strengthen genuine entanglements while weakening spurious ones
        state = self.quantum_detector.network.states.get(info_id)
        if not state:
            return {"success": False, "message": "Info not found", "protocol": "ENTANGLEMENT_DISTILLATION"}

        improved_connections = 0
        for entangled_id in state.entangled_with[:]:  # Copy list to iterate safely
            ent_link = self.quantum_detector.network._find_entanglement(info_id, entangled_id)
            if ent_link:
                # Increase strength of genuine connections, decrease spurious
                if self._is_genuine_connection(info_id, entangled_id):
                    ent_link.entanglement_strength = min(1.0, ent_link.entanglement_strength + 0.2)
                    improved_connections += 1
                else:
                    ent_link.entanglement_strength = max(0.0, ent_link.entanglement_strength - 0.2)
                    if ent_link.entanglement_strength < 0.1:
                        # Sever very weak connections
                        state.entangled_with.remove(entangled_id)
                        if entangled_id in self.quantum_detector.network.states:
                            other_state = self.quantum_detector.network.states[entangled_id]
                            if info_id in other_state.entangled_with:
                                other_state.entangled_with.remove(info_id)

        return {
            "success": True,
            "info_id": info_id,
            "connections_improved": improved_connections,
            "protocol": "ENTANGLEMENT_DISTILLATION"
        }

    def _is_genuine_connection(self, id1: str, id2: str) -> bool:
        """Heuristic to determine if two pieces of information should be genuinely connected"""
        content1 = self.quantum_detector.network.states[id1].content.lower()
        content2 = self.quantum_detector.network.states[id2].content.lower()

        # Check for genuine relationship using semantic analysis
        # This is a simplified heuristic
        keywords_that_indicate_real_connection = [
            "based on", "according to", "cites", "references", "supports",
            "contradicts", "reviews", "analyzes", "finds"
        ]

        for keyword in keywords_that_indicate_real_connection:
            if keyword in content1 or keyword in content2:
                return True

        # Mutual information content
        tokens1 = set(content1.split())
        tokens2 = set(content2.split())

        # If they share domain-specific terms
        domain_terms = {
            "scientific": {"study", "research", "data", "experiment", "results", "evidence"},
            "political": {"policy", "government", "election", "vote", "bill", "law"},
            "health": {"medical", "treatment", "symptoms", "study", "research", "doctor"}
        }

        for domain, terms in domain_terms.items():
            if not tokens1.isdisjoint(terms) and not tokens2.isdisjoint(terms):
                return True

        return False

    def _apply_coherence_preservation(self, info_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Apply coherence preservation techniques"""
        if info_id in self.quantum_detector.network.states:
            state = self.quantum_detector.network.states[info_id]
            # Reduce the decay rate to preserve quantum properties longer
            self.quantum_detector.network.coherence_decay_rates[info_id] *= 0.5
            state.quantum_fidelity = min(1.0, state.quantum_fidelity + 0.1)

            return {
                "success": True,
                "info_id": info_id,
                "new_decay_rate": self.quantum_detector.network.coherence_decay_rates[info_id],
                "fidelity_increase": 0.1,
                "protocol": "COHERENCE_PRESERVATION"
            }

        return {"success": False, "message": "Info not found", "protocol": "COHERENCE_PRESERVATION"}

    def _apply_quantum_stealth_encoding(self, info_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Apply quantum stealth encoding to protect legitimate information"""
        if info_id in self.quantum_detector.network.states:
            state = self.quantum_detector.network.states[info_id]

            # Modify the quantum state to make it less detectable by misinformation systems
            # This is a protective measure for legitimate content
            original_phase = state.phase
            state.phase = (state.phase + math.pi/4) % (2 * math.pi)  # Shift phase
            state.quantum_fidelity = min(1.0, state.quantum_fidelity + 0.15)

            return {
                "success": True,
                "info_id": info_id,
                "original_phase": original_phase,
                "new_phase": state.phase,
                "stealth_applied": True,
                "protocol": "QUANTUM_STEALTH_ENCODING"
            }

        return {"success": False, "message": "Info not found", "protocol": "QUANTUM_STEALTH_ENCODING"}

    def run_quantum_forensic_analysis(self, info_id: str) -> Dict[str, Any]:
        """Run comprehensive quantum forensic analysis on information"""
        if info_id not in self.quantum_detector.network.states:
            return {"error": "Info not found"}

        state = self.quantum_detector.network.states[info_id]

        # Comprehensive analysis
        entanglement_analysis = self.quantum_detector.detect_entanglement_patterns([info_id])
        misinfo_analysis = self.quantum_detector.analyze_misinformation_propensity(info_id)
        interference_analysis = self.quantum_detector.detect_quantum_interference_signatures()

        # Look for this specific info in interference patterns
        relevant_interference = [
            pattern for pattern in interference_analysis
            if info_id in pattern["info_set"]
        ]

        # Coherence history analysis
        measurement_events = [
            event for timestamp, event, value in state.measurement_history
        ]

        return {
            "info_id": info_id,
            "quantum_forensic_report": {
                "state_analysis": {
                    "type": state.state_type.value,
                    "probability": state.probability,
                    "coherence": state.quantum_fidelity,
                    "phase": state.phase,
                    "age_hours": (datetime.now() - state.coherence_time).total_seconds() / 3600
                },
                "entanglement_forensics": entanglement_analysis,
                "misinfo_assessment": misinfo_analysis,
                "interference_patterns": relevant_interference,
                "measurement_history": measurement_events,
                "quantum_signature": self._generate_quantum_signature(state, entanglement_analysis)
            }
        }

    def _generate_quantum_signature(self, state: QuantumInformationState, entanglement_analysis: Dict) -> str:
        """Generate a quantum signature for the information state"""
        # Create a hash-like signature based on quantum properties
        import hashlib

        sig_components = [
            str(abs(state.amplitude)),
            str(state.phase),
            str(state.quantum_fidelity),
            str(len(state.entangled_with)),
            str(state.probability)
        ]

        signature_input = "|".join(sig_components)
        return hashlib.md5(signature_input.encode()).hexdigest()


# Convenience function for easy integration
def create_quantum_defense_system() -> QuantumInformationDefenseSystem:
    """
    Factory function to create and initialize the quantum-inspired defense system
    """
    return QuantumInformationDefenseSystem()
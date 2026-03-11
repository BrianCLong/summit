"""
Commander's Intent:
Introduce a Decoy Narrative Lattice data model representing synthetic,
non-operational narrative structures. These structures are designed solely
to exercise and measure adversarial behavior and model robustness internally,
acting as a form of counter-terrain or early-warning system.

Abuse Analysis:
Decoy structures could theoretically be misused if deployed into live
operational environments or exposed to public end-users. To prevent this,
the system ensures decoy nodes use a distinct namespace, explicitly tags
them as `is_decoy`, and restricts their use entirely to internal, synthetic,
and testing environments. Decoys must never leak to production data stores
used for real-world interactions.
"""

import uuid
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SensitivityProfile(str, Enum):
    EXECUTIVE_BRAND = "EXECUTIVE_BRAND"
    CRITICAL_INFRA = "CRITICAL_INFRA"
    GEOSECURITY = "GEOSECURITY"
    ELECTIONS_INFO_SPACE = "ELECTIONS_INFO_SPACE"

class DecoyNarrativeNode(BaseModel):
    decoy_id: str = Field(default_factory=lambda: f"decoy_{uuid.uuid4().hex}")
    theme_vector: list[str]
    sensitivity_profile: SensitivityProfile
    intended_trigger_patterns: list[str]
    is_decoy: bool = True
    is_triggered: bool = False

class RelationType(str, Enum):
    SUPPORTS = "SUPPORTS"
    CONTRADICTS = "CONTRADICTS"
    AMPLIFIES = "AMPLIFIES"
    CO_OCCURS = "CO_OCCURS"
    TARGETS = "TARGETS"

class VisibilityLevel(str, Enum):
    INTERNAL_ONLY = "INTERNAL_ONLY"
    HARNESS_ONLY = "HARNESS_ONLY"

class DecoyRelation(BaseModel):
    source_id: str
    target_id: str
    relation_type: RelationType
    visibility_level: VisibilityLevel = VisibilityLevel.INTERNAL_ONLY
    is_decoy: bool = True

class DecoyLattice(BaseModel):
    nodes: list[DecoyNarrativeNode] = Field(default_factory=list)
    relations: list[DecoyRelation] = Field(default_factory=list)
    sensitivity_profile: Optional[SensitivityProfile] = None
    coverage_scenarios: list[str] = Field(default_factory=list)

def generate_decoy_lattice(
    profile: SensitivityProfile,
    risk_scenarios: list[str],
    num_nodes: int = 5,
    num_relations: int = 5
) -> DecoyLattice:
    """
    Generates a small synthetic lattice based on a target sensitivity profile
    and risk scenarios.
    """
    lattice = DecoyLattice(
        sensitivity_profile=profile,
        coverage_scenarios=risk_scenarios
    )

    # Generate nodes
    for i in range(num_nodes):
        node = DecoyNarrativeNode(
            theme_vector=[f"theme_{profile.value.lower()}_{i}"],
            sensitivity_profile=profile,
            intended_trigger_patterns=[scen for scen in risk_scenarios]
        )
        lattice.nodes.append(node)

    # Generate relations
    if num_nodes > 1:
        import random
        random.seed(42) # Deterministic for tests
        for _ in range(num_relations):
            src = random.choice(lattice.nodes).decoy_id
            tgt = random.choice(lattice.nodes).decoy_id
            while src == tgt:
                tgt = random.choice(lattice.nodes).decoy_id

            relation = DecoyRelation(
                source_id=src,
                target_id=tgt,
                relation_type=random.choice(list(RelationType))
            )
            lattice.relations.append(relation)

    return lattice

def mark_decoy_triggered(lattice: DecoyLattice, decoy_id: str) -> bool:
    """
    Marks a specific decoy node as triggered when interacted with in tests.
    """
    for node in lattice.nodes:
        if node.decoy_id == decoy_id:
            node.is_triggered = True
            return True
    return False

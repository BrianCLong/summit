"""
Library of known IO tactics and their signatures.
"""

from .tactic_ontology import Signature, Tactic, TacticType

# Firehose of Falsehood
FIREHOSE_TACTIC = Tactic(
    id="TAC-001",
    type=TacticType.FIREHOSE,
    name="Firehose of Falsehood",
    description="High-volume, multi-channel propaganda model that broadcasts a rapid, continuous, and repetitive stream of falsehoods.",
    signatures=[
        Signature(
            name="High Volume",
            description="High frequency of messages from related sources within a short window.",
            conditions={"min_frequency_per_hour": 100},
            weight=0.8
        ),
        Signature(
            name="Multi-Channel Coordination",
            description="Simultaneous messaging across multiple platforms or source types.",
            conditions={"min_unique_platforms": 3},
            weight=0.6
        ),
        Signature(
            name="Repetitive Content",
            description="High similarity in content across messages.",
            conditions={"content_similarity_threshold": 0.8},
            weight=0.7
        )
    ],
    mitigation_suggestions=[
        "Do not engage directly with the content (don't feed the trolls).",
        "Label the source as unreliable.",
        "Flood the zone with accurate, verified information."
    ]
)

# Reflexive Control
REFLEXIVE_CONTROL_TACTIC = Tactic(
    id="TAC-002",
    type=TacticType.REFLEXIVE_CONTROL,
    name="Reflexive Control",
    description="Conveying specially prepared information to an opponent to incline them to voluntarily make the predetermined decision desired by the initiator.",
    signatures=[
        Signature(
            name="Provocative Content",
            description="Content designed to elicit strong emotional response (fear, anger).",
            conditions={"emotional_sentiment": "high_negative"},
            weight=0.6
        ),
        Signature(
            name="Binary Choice Framing",
            description="Presenting a false dilemma to force a specific reaction.",
            conditions={"framing_pattern": "false_dilemma"},
            weight=0.5
        )
    ],
    mitigation_suggestions=[
        "Analyze the intent behind the information.",
        "Pause before reacting to emotionally charged content.",
        "Identify and reject false dichotomies."
    ]
)

# Astroturfing
ASTROTURFING_TACTIC = Tactic(
    id="TAC-003",
    type=TacticType.ASTROTURFING,
    name="Astroturfing",
    description="The practice of masking the sponsors of a message or organization to make it appear as though it originates from and is supported by grassroots participants.",
    signatures=[
        Signature(
            name="Sockpuppet Coordination",
            description="Multiple accounts created around the same time posting similar content.",
            conditions={"account_creation_window_days": 7, "content_similarity": 0.9},
            weight=0.9
        ),
        Signature(
            name="Centralized Timing",
            description="Posts occurring in synchronized bursts.",
            conditions={"burstiness_index": "high"},
            weight=0.7
        )
    ],
    mitigation_suggestions=[
        "Investigate the history of the accounts involved.",
        "Look for patterns in account creation dates and posting times.",
        "Expose the coordinated nature of the campaign."
    ]
)

# Information Laundering
LAUNDERING_TACTIC = Tactic(
    id="TAC-004",
    type=TacticType.LAUNDERING,
    name="Information Laundering",
    description="The process of introducing disinformation into the system through a proxy (e.g., a fringe site) and then legitimizing it through a series of intermediaries until it reaches mainstream media.",
    signatures=[
        Signature(
            name="Source Chain Pattern",
            description="Path from low-credibility source -> proxy -> high-credibility source.",
            conditions={"path_length_min": 3, "credibility_gradient": "increasing"},
            weight=0.8
        ),
        Signature(
            name="Citation Circularity",
            description="Sources citing each other in a closed loop or linear chain without external verification.",
            conditions={"circular_citations": True},
            weight=0.6
        )
    ],
    mitigation_suggestions=[
        "Trace the claim back to its original source.",
        "Verify the credibility of each link in the chain.",
        "Highlight the lack of primary evidence."
    ]
)

# Front Groups
FRONT_GROUPS_TACTIC = Tactic(
    id="TAC-005",
    type=TacticType.FRONT_GROUPS,
    name="Front Groups",
    description="Organizations that purport to represent one agenda while in reality serving the interests of another party (often hidden).",
    signatures=[
        Signature(
            name="Opaque Funding",
            description="Lack of transparency regarding funding sources.",
            conditions={"transparency_score": "low"},
            weight=0.7
        ),
        Signature(
            name="Bridge Node Topology",
            description="Node acts as a bridge between two distinct communities (e.g., radical and mainstream) but shares attributes primarily with the radical one.",
            conditions={"betweenness_centrality": "high", "community_overlap": "low"},
            weight=0.6
        )
    ],
    mitigation_suggestions=[
        "Investigate organizational leadership and funding.",
        "Map relationships to known bad actors.",
        "Demand transparency."
    ]
)

# Sockpuppet Ring (Sub-tactic or specific instance of Astroturfing/Firehose)
SOCKPUPPET_RING_TACTIC = Tactic(
    id="TAC-006",
    type=TacticType.SOCKPUPPET_RING,
    name="Sockpuppet Ring",
    description="A group of fake accounts controlled by a single entity to manipulate opinion.",
    signatures=[
        Signature(
            name="Network Density",
            description="High connectivity within the group, low connectivity to outside.",
            conditions={"internal_density": 0.8, "external_connectivity": 0.1},
            weight=0.9
        )
    ],
    mitigation_suggestions=[
        "Platform-level takedown of the ring.",
        "Network analysis to identify the controller."
    ]
)


ALL_TACTICS = [
    FIREHOSE_TACTIC,
    REFLEXIVE_CONTROL_TACTIC,
    ASTROTURFING_TACTIC,
    LAUNDERING_TACTIC,
    FRONT_GROUPS_TACTIC,
    SOCKPUPPET_RING_TACTIC
]

import networkx as nx

# WARNING: IN-MEMORY STORAGE ONLY
# This module currently uses an in-memory NetworkX graph to store provenance data.
# It is NOT persistent and will be lost on service restart.
# Suitable for development/testing or ephemeral sessions only.
_graph = nx.DiGraph()


def add_claim(claim: dict) -> None:
    """
    Add a Claim entity to the provenance graph.

    A Claim represents an assertion made by an agent.
    """
    _graph.add_node(claim["id"], type="claim", data=claim)


def add_evidence(evid: dict) -> None:
    """
    Add an Evidence entity to the provenance graph.

    Evidence supports or refutes a claim.
    """
    _graph.add_node(evid["id"], type="evidence", data=evid)


def attach(claim_id: str, evidence_id: str, agent: str = "system") -> None:
    """
    Link a Claim to Evidence via an Activity.

    Creates an 'Activity' node (representing the act of attaching)
    and links it to both the claim (generated/influenced) and evidence (used).

    Model: [Claim] <-- (wasGeneratedBy) -- [Activity] -- (used) --> [Evidence]
    """
    act_id = f"attach:{claim_id}:{evidence_id}"
    _graph.add_node(act_id, type="activity", agent=agent)
    _graph.add_edge(act_id, claim_id)
    _graph.add_edge(act_id, evidence_id)


def subgraph_for_claim(claim_id: str) -> nx.DiGraph:
    """
    Retrieve the provenance subgraph for a specific claim.

    Traverses upstream to find all related activities and evidence
    that contributed to this claim.
    """
    nodes = {claim_id}
    for act, tgt in _graph.in_edges(claim_id):
        nodes.add(act)
        nodes.add(tgt)
    for n in list(nodes):
        nodes.update(nx.descendants(_graph, n))
    return _graph.subgraph(nodes).copy()

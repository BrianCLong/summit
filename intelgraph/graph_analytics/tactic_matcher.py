"""
Pattern matcher for detecting IO tactics in campaigns.
"""

from typing import Any, List

from intelgraph.core.tactic_library import ALL_TACTICS
from intelgraph.core.tactic_ontology import Campaign, CampaignEvent, MatchedTactic, TacticType
from intelgraph.graph_analytics.core_analytics import Graph
from intelgraph.graph_analytics.gnn_integration import GNNPredictor


class TacticMatcher:
    """
    Detects tactics in a campaign using heuristic rules, graph patterns, and optional GNN models.
    """

    def __init__(self, tactics=None, gnn_predictor: GNNPredictor = None):
        self.tactics = tactics or ALL_TACTICS
        self.gnn_predictor = gnn_predictor or GNNPredictor()

    def match(self, campaign: Campaign, graph: Graph) -> list[MatchedTactic]:
        """
        Analyze the campaign and graph to identify employed tactics.
        """
        matches = []

        # 1. Run heuristic checks
        for tactic in self.tactics:
            score = 0.0
            evidence = []

            if tactic.type == TacticType.FIREHOSE:
                score, evidence = self._check_firehose(campaign, graph)
            elif tactic.type == TacticType.ASTROTURFING:
                score, evidence = self._check_astroturfing(campaign, graph)
            elif tactic.type == TacticType.SOCKPUPPET_RING:
                score, evidence = self._check_sockpuppet_ring(campaign, graph)
            elif tactic.type == TacticType.LAUNDERING:
                score, evidence = self._check_laundering(campaign, graph)
            elif tactic.type == TacticType.FRONT_GROUPS:
                score, evidence = self._check_front_groups(campaign, graph)
            elif tactic.type == TacticType.REFLEXIVE_CONTROL:
                score, evidence = self._check_reflexive_control(campaign, graph)

            if score > 0.5:  # Threshold for reporting
                matches.append(MatchedTactic(
                    tactic=tactic,
                    confidence=score,
                    evidence=evidence
                ))

        # 2. Run GNN-based prediction if available
        gnn_matches = self.gnn_predictor.predict_tactics(campaign, graph)
        for gnn_match in gnn_matches:
             # Merge or append GNN results
             existing = next((m for m in matches if m.tactic.id == gnn_match.tactic.id), None)
             if existing:
                 # Boost confidence if both heuristics and GNN detect it
                 existing.confidence = min(existing.confidence + 0.1, 1.0)
                 existing.evidence.append(f"GNN Confirmation: {gnn_match.confidence:.2f}")
             else:
                 matches.append(gnn_match)

        return matches

    def _check_firehose(self, campaign: Campaign, graph: Graph) -> tuple[float, list[str]]:
        """
        Check for high volume and repetitive content.
        """
        if not campaign.events:
            return 0.0, []

        volume = len(campaign.events)
        duration_seconds = 1
        if campaign.end_date and campaign.start_date:
            duration_seconds = (campaign.end_date - campaign.start_date).total_seconds()
        elif campaign.events:
             timestamps = [e.timestamp for e in campaign.events]
             if timestamps:
                 duration_seconds = (max(timestamps) - min(timestamps)).total_seconds()

        if duration_seconds < 1:
            duration_seconds = 1

        freq = volume / (duration_seconds / 3600) # events per hour

        score = 0.0
        evidence = []

        if freq > 50:
            score = 0.9
            evidence.append(f"High frequency: {freq:.2f} events/hour")
        elif freq > 10:
            score = 0.6
            evidence.append(f"Moderate frequency: {freq:.2f} events/hour")

        return score, evidence

    def _check_astroturfing(self, campaign: Campaign, graph: Graph) -> tuple[float, list[str]]:
        """
        Check for coordinated behavior among ostensibly independent actors.
        """
        score = 0.0
        evidence = []

        actors = set(e.source_id for e in campaign.events)
        if len(actors) < 3:
             return 0.0, []

        # Check for temporal synchronization (bursts) across multiple actors
        # Heuristic: if > 50% of events happen in top 10% of time windows
        # Simplified: check standard deviation of timestamps (low std dev relative to duration = concentrated)

        timestamps = [e.timestamp.timestamp() for e in campaign.events]
        if not timestamps:
            return 0.0, []

        import statistics
        if len(timestamps) > 1:
            stdev = statistics.stdev(timestamps)
            duration = max(timestamps) - min(timestamps)
            if duration == 0:
                 # All events at exact same time -> infinite concentration
                 score = 0.9
                 evidence.append("Extreme temporal coordination (simultaneous events)")
            else:
                concentration = 1.0 - (stdev * 2 / duration) # Rough heuristic
                if concentration > 0.7:
                     score = 0.7
                     evidence.append(f"High temporal coordination (concentration: {concentration:.2f})")

        return score, evidence

    def _check_sockpuppet_ring(self, campaign: Campaign, graph: Graph) -> tuple[float, list[str]]:
        """
        Check for dense interconnections between actors.
        """
        score = 0.0
        evidence = []

        actors = list(set(e.source_id for e in campaign.events))
        if len(actors) < 3:
            return 0.0, []

        internal_edges = 0
        possible_edges = len(actors) * (len(actors) - 1) / 2
        if possible_edges == 0:
            return 0.0, []

        for i in range(len(actors)):
            for j in range(i + 1, len(actors)):
                if graph.has_edge(actors[i], actors[j]):
                    internal_edges += 1

        density = internal_edges / possible_edges

        if density > 0.5:
            score = density
            evidence.append(f"High network density: {density:.2f}")

        return score, evidence

    def _check_laundering(self, campaign: Campaign, graph: Graph) -> tuple[float, list[str]]:
        """
        Check for information flow from low to high credibility.
        """
        score = 0.0
        evidence = []

        # Look for a chain pattern: A -> B -> C where node attributes suggest credibility gradient
        # Stub implementation assuming 'credibility' attribute exists on nodes

        for event in campaign.events:
            # Check if source has neighbors that are higher credibility
            source = event.source_id
            if not graph.has_node(source):
                continue

            source_cred = graph.get_node_attributes(source).get("credibility", 0.5)

            for neighbor in graph.neighbors(source):
                neighbor_cred = graph.get_node_attributes(neighbor).get("credibility", 0.5)

                # If low cred cites high cred, that's normal.
                # Laundering is often: Low Cred -> Medium Proxy -> High Cred
                # Here we just look for a path step where information flows up
                if source_cred < 0.3 and neighbor_cred > 0.7:
                     # This is a jump, but laundering usually involves an intermediate.
                     # Let's look for neighbors of neighbor
                     pass

        # Simplified structural check: Long linear chains in the graph involved in the campaign
        # If we find a path of length >= 3 among campaign participants
        actors = list(set(e.source_id for e in campaign.events))
        if len(actors) >= 3:
            # Check for simple path A->B->C
            for a in actors:
                for b in actors:
                    if a == b:
                        continue
                    if graph.has_edge(a, b): # Treated as directed flow for this logic? Graph is undirected.
                        # Assuming flow direction inferred or undirected connection
                        for c in actors:
                            if c == b or c == a:
                                continue
                            if graph.has_edge(b, c) and not graph.has_edge(a, c):
                                score = 0.6
                                evidence.append(f"Potential laundering chain detected: {a} -> {b} -> {c}")
                                return score, evidence

        return score, evidence

    def _check_front_groups(self, campaign: Campaign, graph: Graph) -> tuple[float, list[str]]:
        """
        Check for bridge topology: Node acts as bridge but is opaque.
        """
        score = 0.0
        evidence = []

        # Check for bridge nodes
        # A bridge node connects two otherwise disconnected components (or communities)
        # Simplified: Check betweenness centrality if pre-calculated, or local bridge check

        actors = list(set(e.source_id for e in campaign.events))
        for actor in actors:
            neighbors = graph.neighbors(actor)
            if len(neighbors) < 2:
                continue

            # Check if neighbors are connected to each other
            connected_neighbors = 0
            possible = len(neighbors) * (len(neighbors) - 1) / 2
            for n1 in neighbors:
                for n2 in neighbors:
                    if n1 == n2:
                        continue
                    if graph.has_edge(n1, n2):
                        connected_neighbors += 1

            # Divide by 2 because undirected double counting in nested loop check
            actual_connections = connected_neighbors / 2

            clustering_coeff = 0
            if possible > 0:
                clustering_coeff = actual_connections / possible

            # Low clustering coefficient means neighbors don't know each other -> Bridge
            if clustering_coeff < 0.1:
                # If also low transparency (stub attribute)
                transparency = graph.get_node_attributes(actor).get("transparency", 0.5)
                if transparency < 0.3:
                    score = 0.8
                    evidence.append(f"Opaque bridge node detected: {actor}")
                    return score, evidence

        return score, evidence

    def _check_reflexive_control(self, campaign: Campaign, graph: Graph) -> tuple[float, list[str]]:
        """
        Check for provocative content patterns.
        """
        score = 0.0
        evidence = []

        provocative_count = 0
        for event in campaign.events:
            if event.metadata.get("sentiment") == "high_negative":
                provocative_count += 1

        if len(campaign.events) > 0 and (provocative_count / len(campaign.events)) > 0.5:
            score = 0.7
            evidence.append("Dominance of high-negative sentiment content")

        return score, evidence

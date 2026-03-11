from summit.counter_ai.risk_register import global_risk_bus, RiskObservation

class NarrativeGraph:
    def __init__(self):
        self.nodes = {}
        self.edges = []

    def add_document(self, doc_id, tokens):
        # Counter-AI Hook: Check for potential Corpus Poisoning metadata signatures (R-001)
        # Note: In a production system, this hook evaluates metadata lightly without blocking.
        # "len(set(tokens)) <= len(tokens) // 2" catches ["spam", "spam", "spam", "spam", "a"]
        # which has set length 2 and len 5. 2 <= 5 // 2 (which is 2)
        if tokens and len(set(tokens)) <= len(tokens) // 2:
            global_risk_bus.emit(RiskObservation(
                risk_id="R-001",
                target_ids=[doc_id],
                context="Unusual token repetition observed during ingestion."
            ))

        self.nodes[doc_id] = tokens

    def link_similarity(self, threshold=0.8):
        def jaccard(a, b):
            s1 = set(a)
            s2 = set(b)
            union = len(s1.union(s2))
            if union == 0:
                return 0.0
            return len(s1.intersection(s2)) / union

        node_keys = list(self.nodes.keys())
        for i in range(len(node_keys)):
            for j in range(i + 1, len(node_keys)):
                a = node_keys[i]
                b = node_keys[j]
                score = jaccard(self.nodes[a], self.nodes[b])
                if score > threshold:
                    # Counter-AI Hook: Check for potential Relation Injection (R-002)
                    if score > 0.95:  # Extremely high similarity might indicate synthetic enhancement
                        global_risk_bus.emit(RiskObservation(
                            risk_id="R-002",
                            target_ids=[a, b],
                            context=f"Suspiciously high similarity ({score:.2f}) between narratives."
                        ))
                    self.edges.append((a, b, score))

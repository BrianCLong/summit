class NarrativeGraph:
    def __init__(self):
        self.nodes = {}
        self.edges = []

    def add_document(self, doc_id, tokens):
        self.nodes[doc_id] = tokens

    def link_similarity(self, threshold=0.8):
        for a in self.nodes:
            for b in self.nodes:
                if a == b:
                    continue
                score = self.jaccard(self.nodes[a], self.nodes[b])
                if score > threshold:
                    self.edges.append((a, b, score))

    def jaccard(self, a, b):
        set_a = set(a)
        set_b = set(b)
        if not set_a and not set_b:
            return 1.0
        return len(set_a.intersection(set_b)) / len(set_a.union(set_b))

class NarrativeGraph:
    def __init__(self):
        self.nodes = {}
        self.edges = []

    def add_document(self, doc_id, tokens):
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
                    self.edges.append((a, b, score))

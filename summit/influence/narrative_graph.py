import json

def jaccard(set1, set2):
    if not set1 or not set2:
        return 0.0
    return len(set1.intersection(set2)) / len(set1.union(set2))

class NarrativeGraph:
    def __init__(self):
        self.nodes = {}
        self.edges = []

    def add_document(self, doc_id, tokens):
        self.nodes[doc_id] = set(tokens)

    def link_similarity(self, threshold=0.8):
        self.edges = []
        node_ids = list(self.nodes.keys())
        for i in range(len(node_ids)):
            for j in range(i+1, len(node_ids)):
                a = node_ids[i]
                b = node_ids[j]
                score = jaccard(self.nodes[a], self.nodes[b])
                if score > threshold:
                    self.edges.append((a, b, score))

    def get_clusters(self):
        pass

    def save_report(self, path):
        with open(path, 'w') as f:
            json.dump({"nodes": list(self.nodes.keys()), "edges": self.edges}, f)

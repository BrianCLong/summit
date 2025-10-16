import networkx as nx

G = nx.read_gpickle("sei/code_graph.gpickle")
model = Node2vec(G, dimensions=64, workers=2).fit(window=10, min_count=1)
model.wv.save_word2vec_format("artifacts/embeddings/code.vec")

# Hyperedge seed (Cypher-like pseudo)
# UNWIND $edges AS e
# MERGE (h:HyperEdge {id:e.id, kind:e.kind})
# FOREACH (n IN e.nodes | MERGE (x:Node {key:n}) MERGE (x)-[:IN]->(h));

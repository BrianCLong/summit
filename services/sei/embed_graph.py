import networkx as nx
from node2vec import Node2Vec
G = nx.read_gpickle('sei/code_graph.gpickle')
model = Node2vec(G, dimensions=64, workers=2).fit(window=10, min_count=1)
model.wv.save_word2vec_format('artifacts/embeddings/code.vec')
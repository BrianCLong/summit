#!/usr/bin/env python3
import json
import os
import time

import networkx as nx
import torch
from neo4j import GraphDatabase
from torch_geometric.nn import SAGEConv


class SAGE(torch.nn.Module):
    def __init__(self, in_dim, h=128):
        super().__init__()
        self.conv1 = SAGEConv(in_dim, h)
        self.conv2 = SAGEConv(h, h)
        self.scorer = torch.nn.Sequential(
            torch.nn.Linear(2 * h, h), torch.nn.ReLU(), torch.nn.Linear(h, 1)
        )

    def forward(self, x, edge_index, pairs):
        h = torch.relu(self.conv1(x, edge_index))
        h = torch.relu(self.conv2(h, edge_index))
        a = h[pairs[:, 0]]
        b = h[pairs[:, 1]]
        return torch.sigmoid(self.scorer(torch.cat([a, b], dim=1))).squeeze()


def load_graph():
    uri = os.environ["NEO4J_URI"]
    auth = (os.environ["NEO4J_USER"], os.environ["NEO4J_PASS"])
    dr = GraphDatabase.driver(uri, auth=auth)
    with dr.session() as s:
        recs = s.run("MATCH (n)-[r]->(m) RETURN id(n) as s, id(m) as t LIMIT 100000")
        edges = [(r["s"], r["t"]) for r in recs]
    G = nx.DiGraph()
    G.add_edges_from(edges)
    id_map = {n: i for i, n in enumerate(G.nodes())}
    idx_edges = torch.tensor(
        [[id_map[u] for u, v in G.edges()], [id_map[v] for u, v in G.edges()]], dtype=torch.long
    )
    x = torch.randn((G.number_of_nodes(), 32))  # placeholder features; replace with your featurizer
    return x, idx_edges


def main():
    x, edge_index = load_graph()
    pairs = torch.randint(0, x.size(0), (5000, 2))
    y = torch.bernoulli(torch.full((pairs.size(0),), 0.1))
    model = SAGE(x.size(1))
    opt = torch.optim.Adam(model.parameters(), lr=3e-4)
    for epoch in range(10):
        opt.zero_grad()
        pred = model(x, edge_index, pairs)
        loss = torch.nn.functional.binary_cross_entropy(pred, y)
        loss.backward()
        opt.step()
        print(epoch, float(loss))
    torch.save(model.state_dict(), "models/link_pred.pt")
    with open("models/meta.json", "w") as f:
        json.dump({"trained_at": int(time.time()), "in_dim": x.size(1)}, f)


if __name__ == "__main__":
    main()

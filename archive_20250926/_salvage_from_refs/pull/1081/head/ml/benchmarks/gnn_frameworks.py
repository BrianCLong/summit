"""Benchmark inference performance between PyG and DGL frameworks."""

import torch
from torch_geometric.data import Data
from torch_geometric.nn import SAGEConv as PyGSAGEConv

try:  # Optional DGL import
    import dgl
    from dgl.nn import SAGEConv as DGLSAGEConv

    DGL_AVAILABLE = True
except Exception:  # pragma: no cover - DGL may not be installed
    DGL_AVAILABLE = False

from ml.app.profiling import profile_function


class PyGSAGE(torch.nn.Module):
    def __init__(self, in_feats: int, hidden: int, out_feats: int):
        super().__init__()
        self.conv1 = PyGSAGEConv(in_feats, hidden)
        self.conv2 = PyGSAGEConv(hidden, out_feats)

    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index).relu()
        return self.conv2(x, edge_index)


class DGLSAGE(torch.nn.Module):
    def __init__(self, in_feats: int, hidden: int, out_feats: int):
        super().__init__()
        self.conv1 = DGLSAGEConv(in_feats, hidden, aggregator_type="mean")
        self.conv2 = DGLSAGEConv(hidden, out_feats, aggregator_type="mean")

    def forward(self, graph, x):
        x = self.conv1(graph, x).relu()
        return self.conv2(graph, x)


def generate_graph(num_nodes: int = 1000, num_edges: int = 5000, feat_dim: int = 16):
    src = torch.randint(0, num_nodes, (num_edges,))
    dst = torch.randint(0, num_nodes, (num_edges,))
    x = torch.randn(num_nodes, feat_dim)
    return src, dst, x


def benchmark_pyg(src, dst, x):
    data = Data(x=x, edge_index=torch.stack([src, dst]))
    model = PyGSAGE(x.size(1), 32, 16)
    _, latency, mem = profile_function(lambda: model(data.x, data.edge_index))
    return latency, mem


def benchmark_dgl(src, dst, x):
    if not DGL_AVAILABLE:
        return float("nan"), 0
    graph = dgl.graph((src, dst))
    model = DGLSAGE(x.size(1), 32, 16)
    _, latency, mem = profile_function(lambda: model(graph, x))
    return latency, mem


def main():
    src, dst, x = generate_graph()
    pyg_lat, pyg_mem = benchmark_pyg(src, dst, x)
    dgl_lat, dgl_mem = benchmark_dgl(src, dst, x)
    print(f"PyG: {pyg_lat:.4f}s, {pyg_mem/1e6:.2f}MB")
    if DGL_AVAILABLE:
        print(f"DGL: {dgl_lat:.4f}s, {dgl_mem/1e6:.2f}MB")
    else:
        print("DGL: unavailable")


if __name__ == "__main__":
    main()

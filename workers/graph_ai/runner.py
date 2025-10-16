import torch
import torch.nn as nn

try:
    from torch_geometric.data import Data
    from torch_geometric.nn import GATConv
except Exception:
    GATConv = None
    Data = None


class LinkPredGAT(nn.Module):
    def __init__(self, in_dim=128, hid=128):
        super().__init__()
        if GATConv is None:
            self.scorer = nn.Sequential(nn.Linear(in_dim * 2, hid), nn.ReLU(), nn.Linear(hid, 1))
            self.use_torchgeo = False
        else:
            self.g1 = GATConv(in_dim, hid, heads=4, concat=True)
            self.g2 = GATConv(hid * 4, hid, heads=1, concat=True)
            self.scorer = nn.Sequential(nn.Linear(hid * 2, hid), nn.ReLU(), nn.Linear(hid, 1))
            self.use_torchgeo = True

    def forward(self, x, edge_index, pairs):
        if self.use_torchgeo:
            h = self.g1(x, edge_index)
            h = torch.relu(h)
            h = self.g2(h, edge_index)
        else:
            h = x
        a, b = h[pairs[:, 0]], h[pairs[:, 1]]
        s = torch.sigmoid(self.scorer(torch.cat([a, b], dim=1))).squeeze(-1)
        return s

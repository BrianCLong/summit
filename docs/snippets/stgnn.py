import torch
from torch_geometric_temporal.nn.recurrent import GConvGRU


class SpatioTemporalModel(torch.nn.Module):
    def __init__(self, in_channels: int, hidden_channels: int, out_channels: int) -> None:
        super().__init__()
        self.recurrent = GConvGRU(in_channels, hidden_channels, K=3)
        self.projection = torch.nn.Linear(hidden_channels, out_channels)

    def forward(self, features_seq, edges_seq):
        hidden = None
        for x_t, edge_index_t in zip(features_seq, edges_seq):
            hidden = self.recurrent(x_t, edge_index_t, hidden)
        return self.projection(hidden)

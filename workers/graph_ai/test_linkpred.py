import torch
from runner import LinkPredGAT


def test_forward_shapes():
    m = LinkPredGAT(32, 16)
    x = torch.randn(10, 32)
    edge_index = torch.tensor([[0, 1], [1, 2]])
    pairs = torch.tensor([[0, 1], [2, 3]])
    s = m(x, edge_index, pairs)
    assert s.shape[0] == 2

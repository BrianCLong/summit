import pytest

from services.indexing.merkle.models import MerkleNode, MerkleTree
from services.indexing.simhash.ann import IndexCandidate, SimhashANN
from services.indexing.simhash.compute import SimhashBuilder


def create_mock_tree(fh):
    r = MerkleNode(name="", hash="root", is_dir=True)
    for i, h in enumerate(fh):
        r.children[str(i)] = MerkleNode(name=str(i), hash=h, is_dir=False)
    return MerkleTree(root=r)


def test_simhash():
    b = SimhashBuilder()
    t1 = create_mock_tree(["h1", "h2"])
    h1 = b.compute(t1)
    assert len(h1) == 64

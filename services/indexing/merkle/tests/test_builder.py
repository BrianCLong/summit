import pytest
from pathlib import Path
from services.indexing.merkle.builder import MerkleBuilder, SyncPlanner

def test_merkle_builder_opaque():
    fixture_path = Path(__file__).parent / "fixtures" / "repo_small"
    builder = MerkleBuilder(str(fixture_path))
    tree = builder.build()
    assert tree.root.is_dir
    # Root name is ""
    assert tree.root.name == ""
    # Children have opaque IDs
    assert len(tree.root.children) == 2
    for child in tree.root.children.values():
        assert len(child.name) == 16 or child.name == ""

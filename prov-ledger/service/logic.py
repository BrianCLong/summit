import hashlib
from pymerkle import InmemoryTree as MerkleTree

def generate_checksum(content: str) -> str:
    """Generates a SHA256 checksum for the given content."""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def generate_merkle_root(items: list[str]) -> str:
    """Generates a Merkle root for the given list of items."""
    tree = MerkleTree(algorithm='sha256')
    for item in items:
        tree.append_entry(item.encode('utf-8'))
    return tree.get_state().hex()

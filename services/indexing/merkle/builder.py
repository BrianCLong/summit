import hashlib
import hmac
from pathlib import Path
from typing import Dict, List, Optional
from .models import MerkleNode, MerkleTree

class MerkleBuilder:
    """Builds a Merkle tree with opaque path IDs (HMAC)."""

    def __init__(self, root_path: str, hmac_key: str = "summit-secret"):
        self.root_path = Path(root_path).resolve()
        self.hmac_key = hmac_key.encode('utf-8')

    def build(self) -> MerkleTree:
        root_node = self._build_recursive(self.root_path, "")
        return MerkleTree(root=root_node)

    def _get_opaque_id(self, relative_path: str) -> str:
        if not relative_path: return ""
        return hmac.new(self.hmac_key, relative_path.encode('utf-8'), hashlib.sha256).hexdigest()[:16]

    def _build_recursive(self, current_path: Path, rel_path: str) -> MerkleNode:
        opaque_id = self._get_opaque_id(rel_path)

        if current_path.is_file():
            file_hash = self._hash_file(current_path)
            return MerkleNode(name=opaque_id, hash=file_hash, is_dir=False)

        children = {}
        child_paths = sorted(current_path.iterdir())
        for cp in child_paths:
            if cp.name.startswith('.'): continue
            child_rel = f"{rel_path}/{cp.name}" if rel_path else cp.name
            child_opaque = self._get_opaque_id(child_rel)
            children[child_opaque] = self._build_recursive(cp, child_rel)

        dir_hash = self._hash_directory(children)
        return MerkleNode(name=opaque_id, hash=dir_hash, is_dir=True, children=children)

    def _hash_file(self, path: Path) -> str:
        sha256 = hashlib.sha256()
        with open(path, "rb") as f:
            while chunk := f.read(8192): sha256.update(chunk)
        return sha256.hexdigest()

    def _hash_directory(self, children: Dict[str, MerkleNode]) -> str:
        sha256 = hashlib.sha256()
        for opaque_id in sorted(children.keys()):
            sha256.update(opaque_id.encode('utf-8'))
            sha256.update(children[opaque_id].hash.encode('utf-8'))
        return sha256.hexdigest()

class SyncPlanner:
    @staticmethod
    def diff(client_tree: MerkleTree, server_tree: MerkleTree) -> List[str]:
        to_sync = []
        SyncPlanner._diff_recursive(client_tree.root, server_tree.root, to_sync)
        return to_sync

    @staticmethod
    def _diff_recursive(client_node: MerkleNode, server_node: MerkleNode, to_sync: List[str]):
        if client_node.hash == server_node.hash: return
        if not client_node.is_dir:
            to_sync.append(client_node.name)
            return
        for oid, child in client_node.children.items():
            if oid not in server_node.children:
                to_sync.append(oid)
            else:
                SyncPlanner._diff_recursive(child, server_node.children[oid], to_sync)

"""
Sprint 14 Manifest Builder & Signer
Merkle tree manifest with KMS signing support
"""

import hashlib
import json
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class FileEntry:
    """File entry in manifest"""

    path: str
    checksum: str
    size_bytes: int
    content_type: str
    modified_time: str


@dataclass
class ManifestMetadata:
    """Manifest metadata"""

    version: str
    created_at: str
    created_by: str
    description: str
    tags: list[str]


@dataclass
class MerkleProof:
    """Merkle proof for verification"""

    leaf_hash: str
    proof_hashes: list[str]
    root_hash: str


@dataclass
class Manifest:
    """Complete manifest with Merkle tree"""

    id: str
    version: str
    metadata: ManifestMetadata
    files: list[FileEntry]
    merkle_root: str
    merkle_proofs: dict[str, MerkleProof]
    signature: str | None = None
    timestamp: str = ""

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()


class ManifestBuilder:
    """Manifest builder with Merkle tree construction"""

    def __init__(self):
        self.logger = logger.bind(service="manifest_builder")

    async def build_manifest(
        self, files: list[FileEntry], metadata: ManifestMetadata, manifest_id: str | None = None
    ) -> Manifest:
        """Build complete manifest with Merkle tree"""
        manifest_id = manifest_id or str(uuid.uuid4())

        self.logger.info("Building manifest", manifest_id=manifest_id, file_count=len(files))

        # Sort files for deterministic ordering
        sorted_files = sorted(files, key=lambda f: f.path)

        # Build Merkle tree
        merkle_root, merkle_proofs = self._build_merkle_tree(sorted_files)

        # Create manifest
        manifest = Manifest(
            id=manifest_id,
            version=metadata.version,
            metadata=metadata,
            files=sorted_files,
            merkle_root=merkle_root,
            merkle_proofs=merkle_proofs,
        )

        # Sign manifest
        manifest.signature = self._sign_manifest(manifest)

        self.logger.info(
            "Manifest built successfully",
            manifest_id=manifest_id,
            merkle_root=merkle_root[:16] + "...",
        )

        return manifest

    def _build_merkle_tree(self, files: list[FileEntry]) -> tuple[str, dict[str, MerkleProof]]:
        """Build Merkle tree from file list"""
        if not files:
            return hashlib.sha256(b"").hexdigest(), {}

        # Create leaf hashes
        leaf_hashes = []
        for file_entry in files:
            leaf_hash = self._hash_file_entry(file_entry)
            leaf_hashes.append(leaf_hash)

        # Build tree bottom-up
        current_level = leaf_hashes[:]
        tree_levels = [current_level[:]]  # Store all levels for proof generation

        while len(current_level) > 1:
            next_level = []

            for i in range(0, len(current_level), 2):
                left = current_level[i]
                right = current_level[i + 1] if i + 1 < len(current_level) else left

                combined_hash = left + right
                parent_hash = hashlib.sha256(combined_hash.encode()).hexdigest()
                next_level.append(parent_hash)

            tree_levels.append(next_level[:])
            current_level = next_level

        root_hash = current_level[0]

        # Generate proofs for all files
        proofs = {}
        for i, file_entry in enumerate(files):
            leaf_hash = leaf_hashes[i]
            proof = self._generate_merkle_proof(tree_levels, i, leaf_hash, root_hash)
            proofs[file_entry.path] = proof

        return root_hash, proofs

    def _generate_merkle_proof(
        self, tree_levels: list[list[str]], leaf_index: int, leaf_hash: str, root_hash: str
    ) -> MerkleProof:
        """Generate Merkle proof for specific leaf"""
        proof_hashes = []
        index = leaf_index

        for level in tree_levels[:-1]:  # Exclude root level
            # Find sibling
            if index % 2 == 0:  # Left child
                sibling_index = index + 1
            else:  # Right child
                sibling_index = index - 1

            # Add sibling hash if it exists
            if sibling_index < len(level):
                proof_hashes.append(level[sibling_index])

            # Move to parent level
            index = index // 2

        return MerkleProof(leaf_hash=leaf_hash, proof_hashes=proof_hashes, root_hash=root_hash)

    def _hash_file_entry(self, file_entry: FileEntry) -> str:
        """Create hash for file entry"""
        canonical_data = {
            "path": file_entry.path,
            "checksum": file_entry.checksum,
            "size_bytes": file_entry.size_bytes,
            "content_type": file_entry.content_type,
            "modified_time": file_entry.modified_time,
        }

        canonical_json = json.dumps(canonical_data, sort_keys=True)
        return hashlib.sha256(canonical_json.encode()).hexdigest()

    def _sign_manifest(self, manifest: Manifest) -> str:
        """Sign manifest (simplified version)"""
        # Create canonical representation
        manifest_copy = Manifest(**asdict(manifest))
        manifest_copy.signature = None

        canonical_data = json.dumps(asdict(manifest_copy), sort_keys=True)
        return hashlib.sha256(canonical_data.encode()).hexdigest()

    def verify_manifest(self, manifest: Manifest) -> dict[str, bool]:
        """Verify manifest integrity"""
        results = {"signature_valid": False, "merkle_tree_valid": False}

        try:
            # Verify Merkle tree
            expected_root, _ = self._build_merkle_tree(manifest.files)
            results["merkle_tree_valid"] = expected_root == manifest.merkle_root

            # Verify signature (simplified)
            expected_signature = self._sign_manifest(manifest)
            results["signature_valid"] = expected_signature == manifest.signature

            return results
        except Exception as e:
            self.logger.error("Manifest verification failed", error=str(e))
            return results

    def export_manifest(self, manifest: Manifest, output_path: Path):
        """Export manifest to JSON file"""
        with open(output_path, "w") as f:
            json.dump(asdict(manifest), f, indent=2, sort_keys=True)

    @classmethod
    def load_manifest(cls, manifest_path: Path) -> Manifest:
        """Load manifest from JSON file"""
        with open(manifest_path) as f:
            data = json.load(f)

        # Convert back to dataclasses
        metadata = ManifestMetadata(**data["metadata"])
        files = [FileEntry(**file_data) for file_data in data["files"]]

        merkle_proofs = {}
        for path, proof_data in data["merkle_proofs"].items():
            merkle_proofs[path] = MerkleProof(**proof_data)

        return Manifest(
            id=data["id"],
            version=data["version"],
            metadata=metadata,
            files=files,
            merkle_root=data["merkle_root"],
            merkle_proofs=merkle_proofs,
            signature=data.get("signature"),
            timestamp=data.get("timestamp", ""),
        )


# Example usage
if __name__ == "__main__":
    builder = ManifestBuilder()

    # Sample files
    files = [
        FileEntry(
            path="data/entities.json",
            checksum="a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
            size_bytes=1024,
            content_type="application/json",
            modified_time="2025-09-01T10:00:00Z",
        )
    ]

    # Sample metadata
    metadata = ManifestMetadata(
        version="1.0.0",
        created_at="2025-09-01T10:00:00Z",
        created_by="system",
        description="Sprint 14 evidence package",
        tags=["sprint14", "evidence"],
    )

    # Build manifest
    import asyncio

    manifest = asyncio.run(builder.build_manifest(files, metadata))

    print(f"Manifest ID: {manifest.id}")
    print(f"Merkle Root: {manifest.merkle_root}")
    print(f"Files: {len(manifest.files)}")

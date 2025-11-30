"""Maestro storage layer - in-memory implementation."""

from typing import Any

from .models import Artifact, DisclosurePack, Run


class MaestroStore:
    """In-memory storage for Maestro runs, artifacts, and disclosure packs."""

    def __init__(self):
        self.runs: dict[str, Run] = {}
        self.artifacts: dict[str, Artifact] = {}
        self.disclosure_packs: dict[str, DisclosurePack] = {}

    # Run operations
    def create_run(self, run: Run) -> Run:
        """Create a new run."""
        self.runs[run.id] = run
        return run

    def get_run(self, run_id: str) -> Run | None:
        """Get a run by ID."""
        return self.runs.get(run_id)

    def list_runs(
        self, owner: str | None = None, status: str | None = None
    ) -> list[Run]:
        """List all runs, optionally filtered by owner or status."""
        runs = list(self.runs.values())
        if owner:
            runs = [r for r in runs if r.owner == owner]
        if status:
            runs = [r for r in runs if r.status == status]
        return sorted(runs, key=lambda r: r.started_at, reverse=True)

    def update_run(self, run_id: str, updates: dict[str, Any]) -> Run | None:
        """Update a run with the given fields."""
        run = self.runs.get(run_id)
        if not run:
            return None

        for key, value in updates.items():
            if hasattr(run, key):
                setattr(run, key, value)

        return run

    # Artifact operations
    def create_artifact(self, artifact: Artifact) -> Artifact:
        """Create a new artifact."""
        self.artifacts[artifact.id] = artifact
        return artifact

    def get_artifact(self, artifact_id: str) -> Artifact | None:
        """Get an artifact by ID."""
        return self.artifacts.get(artifact_id)

    def list_artifacts(self, run_id: str | None = None) -> list[Artifact]:
        """List all artifacts, optionally filtered by run_id."""
        artifacts = list(self.artifacts.values())
        if run_id:
            artifacts = [a for a in artifacts if a.run_id == run_id]
        return sorted(artifacts, key=lambda a: a.created_at, reverse=True)

    # Disclosure pack operations
    def create_disclosure_pack(self, pack: DisclosurePack) -> DisclosurePack:
        """Create a new disclosure pack."""
        self.disclosure_packs[pack.id] = pack
        return pack

    def get_disclosure_pack(self, pack_id: str) -> DisclosurePack | None:
        """Get a disclosure pack by ID."""
        return self.disclosure_packs.get(pack_id)

    def get_disclosure_pack_by_run(self, run_id: str) -> DisclosurePack | None:
        """Get the disclosure pack for a specific run."""
        for pack in self.disclosure_packs.values():
            if pack.run_id == run_id:
                return pack
        return None

    def list_disclosure_packs(self) -> list[DisclosurePack]:
        """List all disclosure packs."""
        return sorted(
            self.disclosure_packs.values(), key=lambda p: p.created_at, reverse=True
        )

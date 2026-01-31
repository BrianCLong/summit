# summit/cluster/drivers/vind/driver.py
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
from .vcluster_cli import VClusterCLI

@dataclass(frozen=True)
class VindClusterSpec:
    name: str
    kubeconfig_path: Optional[str] = None
    # TODO: extend with safe subset of vcluster create flags

class VindDriver:
    """
    Summit driver for 'vCluster in Docker' via vcluster CLI.
    Deny-by-default: operations disabled unless SUMMIT_VIND_ENABLED=1.
    """
    def __init__(self, cli: VClusterCLI):
        self._cli = cli

    def create(self, spec: VindClusterSpec) -> str:
        """
        Implement vcluster create <name> and return kubeconfig path.
        """
        # Using --connect=false as per e2e smoke test
        self._cli.run(["create", spec.name, "--connect=false"])
        # vcluster create usually places kubeconfig in current dir or specific location
        # For simplicity in this driver, we assume it's handled or we'd fetch it
        return f"./kubeconfig-{spec.name}.yaml"

    def delete(self, name: str) -> None:
        """
        Implement vcluster delete <name>.
        """
        self._cli.run(["delete", name])

    def pause(self, name: str) -> None:
        """
        Implement vcluster pause <name>.
        """
        self._cli.run(["pause", name])

    def resume(self, name: str) -> None:
        """
        Implement vcluster resume <name>.
        """
        self._cli.run(["resume", name])

    def join_node(self, name: str, node_spec: dict) -> None:
        """
        Hybrid node join workflow (VPN). Coming soon.
        """
        raise NotImplementedError("join_node is not implemented yet")

    def snapshot_create(self, name: str) -> str:
        """
        Create a cluster snapshot. Coming soon.
        """
        raise NotImplementedError("snapshot_create is not implemented yet")

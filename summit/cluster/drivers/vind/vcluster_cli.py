# summit/cluster/drivers/vind/vcluster_cli.py
import os
import subprocess
from typing import Sequence

NEVER_LOG_ENV_KEYS = {"KUBECONFIG", "VCLUSTER_ACCESS_KEY", "LOFT_ACCESS_KEY"}

class VClusterCLI:
    def __init__(self, bin_name: str = "vcluster"):
        self._bin = bin_name

    def run(self, args: Sequence[str]) -> str:
        env = {k: v for k, v in os.environ.items() if k not in NEVER_LOG_ENV_KEYS}
        p = subprocess.run([self._bin, *args], env=env, capture_output=True, text=True)
        if p.returncode != 0:
            # TODO: redact secrets from stderr defensively
            raise RuntimeError(f"vcluster failed: rc={p.returncode}")
        return p.stdout

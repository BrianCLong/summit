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
        # Redact secrets from environment before passing to subprocess if any was missed
        p = subprocess.run([self._bin, *args], env=env, capture_output=True, text=True)

        stdout = self._redact(p.stdout)
        stderr = self._redact(p.stderr)

        if p.returncode != 0:
            raise RuntimeError(f"vcluster failed: rc={p.returncode}, stderr={stderr}")
        return stdout

    def _redact(self, text: str) -> str:
        # Simple redaction for common secret patterns
        redacted = text
        for key in NEVER_LOG_ENV_KEYS:
            val = os.environ.get(key)
            if val:
                redacted = redacted.replace(val, "[REDACTED]")
        return redacted

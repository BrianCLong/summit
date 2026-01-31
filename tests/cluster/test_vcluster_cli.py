# tests/cluster/test_vcluster_cli.py
import os
from unittest.mock import patch, MagicMock
from summit.cluster.drivers.vind.vcluster_cli import VClusterCLI

def test_cli_env_filtering():
    cli = VClusterCLI()
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0, stdout="success")

        # Set a sensitive env var
        os.environ["KUBECONFIG"] = "secret-path"
        os.environ["SAFE_VAR"] = "safe-value"

        cli.run(["version"])

        # Check the env passed to subprocess.run
        args, kwargs = mock_run.call_args
        env = kwargs.get("env")

        assert "SAFE_VAR" in env
        assert "KUBECONFIG" not in env

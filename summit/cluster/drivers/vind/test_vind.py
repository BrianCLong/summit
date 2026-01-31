import pytest
from unittest.mock import MagicMock
from summit.cluster.drivers.vind.driver import VindDriver, VindClusterSpec
from summit.cluster.drivers.vind.vcluster_cli import VClusterCLI

def test_vind_driver_create():
    cli = MagicMock(spec=VClusterCLI)
    driver = VindDriver(cli)
    spec = VindClusterSpec(name="test-cluster")

    path = driver.create(spec)

    cli.run.assert_called_once_with(["create", "test-cluster", "--connect=false", "--kubeconfig", path])
    assert "test-cluster" in path

def test_vind_driver_pause():
    cli = MagicMock(spec=VClusterCLI)
    driver = VindDriver(cli)

    driver.pause("test-cluster")

    cli.run.assert_called_once_with(["pause", "test-cluster"])

def test_vcluster_cli_redaction(monkeypatch):
    monkeypatch.setenv("KUBECONFIG", "secret-kubeconfig-path")
    cli = VClusterCLI()

    redacted = cli._redact("Error: could not find secret-kubeconfig-path")
    assert "secret-kubeconfig-path" not in redacted
    assert "[REDACTED]" in redacted

def test_vcluster_cli_run_redacts_stdout(monkeypatch):
    monkeypatch.setenv("KUBECONFIG", "secret-kubeconfig-path")
    # Mock subprocess.run to return a secret in stdout
    import subprocess
    from unittest.mock import MagicMock

    mock_p = MagicMock()
    mock_p.returncode = 0
    mock_p.stdout = "Kubeconfig is at secret-kubeconfig-path"
    mock_p.stderr = ""

    monkeypatch.setattr(subprocess, "run", lambda *args, **kwargs: mock_p)

    cli = VClusterCLI()
    output = cli.run(["some", "command"])

    assert "secret-kubeconfig-path" not in output
    assert "[REDACTED]" in output

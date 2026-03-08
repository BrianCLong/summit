from unittest.mock import MagicMock

import pytest

from summit.cluster.drivers.vind.driver import VindClusterSpec, VindDriver
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

def test_vind_driver_hybrid_deny(monkeypatch):
    monkeypatch.setattr("summit.cluster.drivers.vind.driver.SUMMIT_VIND_HYBRID_ENABLED", False)
    cli = MagicMock(spec=VClusterCLI)
    driver = VindDriver(cli)

    with pytest.raises(NotImplementedError, match="Hybrid nodes feature is disabled"):
        driver.hybrid_join("test", "1.2.3.4")

def test_vind_driver_snapshots_deny(monkeypatch):
    monkeypatch.setattr("summit.cluster.drivers.vind.driver.SUMMIT_VIND_SNAPSHOTS_ENABLED", False)
    cli = MagicMock(spec=VClusterCLI)
    driver = VindDriver(cli)

    with pytest.raises(NotImplementedError, match="Snapshots feature is disabled"):
        driver.snapshot_create("test", "snap1")

    with pytest.raises(NotImplementedError, match="Snapshots feature is disabled"):
        driver.snapshot_restore("test", "snap1")

def test_vind_driver_innovation_allow(monkeypatch):
    monkeypatch.setattr("summit.cluster.drivers.vind.driver.SUMMIT_VIND_HYBRID_ENABLED", True)
    monkeypatch.setattr("summit.cluster.drivers.vind.driver.SUMMIT_VIND_SNAPSHOTS_ENABLED", True)
    cli = MagicMock(spec=VClusterCLI)
    driver = VindDriver(cli)

    driver.hybrid_join("test", "1.2.3.4")
    driver.snapshot_create("test", "snap1")
    driver.snapshot_restore("test", "snap1")

    assert cli.run.call_count == 3

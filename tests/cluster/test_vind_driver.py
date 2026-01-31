# tests/cluster/test_vind_driver.py
import pytest
from unittest.mock import MagicMock
from summit.cluster.drivers.vind.driver import VindDriver, VindClusterSpec
from summit.cluster.drivers.vind.vcluster_cli import VClusterCLI

def test_driver_lifecycle():
    mock_cli = MagicMock(spec=VClusterCLI)
    driver = VindDriver(cli=mock_cli)
    spec = VindClusterSpec(name="test-cluster")

    # Test Create
    driver.create(spec)
    mock_cli.run.assert_called_with(["create", "test-cluster", "--connect=false"])

    # Test Pause
    driver.pause("test-cluster")
    mock_cli.run.assert_called_with(["pause", "test-cluster"])

    # Test Resume
    driver.resume("test-cluster")
    mock_cli.run.assert_called_with(["resume", "test-cluster"])

    # Test Delete
    driver.delete("test-cluster")
    mock_cli.run.assert_called_with(["delete", "test-cluster"])

def test_placeholders():
    driver = VindDriver(cli=None)
    with pytest.raises(NotImplementedError):
        driver.join_node("c", {})
    with pytest.raises(NotImplementedError):
        driver.snapshot_create("c")

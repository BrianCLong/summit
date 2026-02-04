import os
from unittest import mock

from integrity.sim.base import DatasetAdapter


def test_sim_adapter_disabled_by_default():
    adapter = DatasetAdapter()
    assert list(adapter.load_events("any")) == []

def test_sim_adapter_enabled_error():
    # If enabled but not implemented, should raise NotImplementedError
    adapter = DatasetAdapter()
    with mock.patch.dict(os.environ, {"INTEGRITY_SIM_HARNESS_ENABLED": "true"}):
        try:
            adapter.load_events("any")
        except NotImplementedError:
            pass
        else:
            raise AssertionError("Should have raised NotImplementedError")

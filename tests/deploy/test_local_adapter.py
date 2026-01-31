import os
from unittest.mock import patch

import pytest

from summit.builder.api import BuilderAPI
from summit.builder.spec import BuilderSpec
from summit.deploy.local import LocalDeployAdapter


def test_local_deploy_adapter():
    adapter = LocalDeployAdapter()
    url = adapter.deploy("/tmp/my-project")
    assert "http://localhost:8080/deployments/my-project" == url

@patch.dict(os.environ, {"SUMMIT_BUILDER_ENABLED": "1"})
def test_builder_api_flow(tmp_path):
    api = BuilderAPI()
    spec = BuilderSpec(intent="test", document_types=[], target_schema={})
    dest = str(tmp_path / "out")

    endpoint = api.create_and_deploy(spec, dest)
    assert endpoint is not None
    assert "localhost" in endpoint
    assert (tmp_path / "out" / "workflow.py").exists()

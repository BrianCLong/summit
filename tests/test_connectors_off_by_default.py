import json

import yaml

from src.workflows.runner import run_workflow


def test_connectors_off_by_default():
    workflow = yaml.safe_load(open("examples/bellingcat_mws.yaml", encoding="utf-8"))
    assert workflow["feature_flags"]["connectors.network"] is False
    assert workflow["feature_flags"]["connectors.archiving"] is False
    assert workflow["feature_flags"]["connectors.reverse_image"] is False


def test_archiving_step_skipped_when_disabled():
    payload = json.loads(open("fixtures/mws_case1/input.json", encoding="utf-8").read())
    result = run_workflow("examples/bellingcat_mws.yaml", payload)
    assert result["steps"]["archive_submit"]["out"] == {}

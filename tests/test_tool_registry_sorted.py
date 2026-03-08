import json


def test_tool_registry_is_sorted_by_tool_id():
    data = json.loads(open("artifacts/toolkit/bellingcat.normalized.json", encoding="utf-8").read())
    ids = [tool["tool_id"] for tool in data]
    assert ids == sorted(ids)

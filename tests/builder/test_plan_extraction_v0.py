import os
from unittest.mock import patch

import pytest

from summit.builder.plan import plan_from_spec
from summit.builder.spec import BuilderSpec


@patch.dict(os.environ, {"SUMMIT_BUILDER_ENABLED": "1"})
def test_plan_from_spec_extraction():
    spec = BuilderSpec(
        intent="Extract invoices",
        document_types=["invoice", "receipt"],
        target_schema={"amount": "number", "vendor": "string"}
    )
    ir = plan_from_spec(spec)

    assert ir.meta["template"] == "extraction_v0"
    assert len(ir.steps) == 3
    assert ir.steps[0].id == "classify"
    assert ir.steps[1].id == "extract"
    assert ir.steps[2].id == "validate"

    assert ir.steps[0].config["types"] == ["invoice", "receipt"]
    assert ir.steps[1].config["schema"] == {"amount": "number", "vendor": "string"}

    assert ("classify", "extract") in ir.edges
    assert ("extract", "validate") in ir.edges

def test_plan_from_spec_disabled():
    with patch.dict(os.environ, {"SUMMIT_BUILDER_ENABLED": "0"}):
        spec = BuilderSpec(intent="test")
        with pytest.raises(PermissionError):
            plan_from_spec(spec)

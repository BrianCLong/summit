"""Diffing behaviour for SPOM reports."""

from spom.diff import diff_reports
from spom.mapper import SPOM
from spom.models import FieldObservation


def test_diff_only_reports_actual_tag_changes():
    mapper = SPOM()
    dataset_v1 = [
        FieldObservation(name="contact_value", sample_values=["+1-202-555-0172"]),
        FieldObservation(name="email_address", sample_values=["user@example.com"]),
    ]
    dataset_v2 = [
        FieldObservation(name="contact_value", sample_values=["person@example.com"]),
        FieldObservation(name="email_address", sample_values=["user@example.com"]),
    ]

    report_v1 = mapper.map_fields(dataset_v1, dataset="v1")
    report_v2 = mapper.map_fields(dataset_v2, dataset="v2")

    diff = diff_reports(report_v1, report_v2)

    assert len(diff.changes) == 1
    change = diff.changes[0]
    assert change.field == "contact_value"
    assert change.from_tag == "PHONE"
    assert change.to_tag == "EMAIL"
    assert "Tag changed" in change.explanation

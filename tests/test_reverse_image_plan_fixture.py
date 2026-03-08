import json
from pathlib import Path

from src.connectors.reverse_image.plan import run


def test_reverse_image_plan_matches_fixture():
    input_payload = json.loads(Path("fixtures/mws_case1/input.json").read_text(encoding="utf-8"))
    expected = json.loads(
        Path("fixtures/mws_case1/expected_reverse_image_plan.json").read_text(encoding="utf-8")
    )
    actual = run(
        {
            "media_url": input_payload["media_url"],
            "engines": ["google_images", "bing_images", "yandex_images", "tineye"],
            "emit_manual_links": True,
        }
    )
    assert actual == expected

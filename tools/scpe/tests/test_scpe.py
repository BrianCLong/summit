from __future__ import annotations

import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
SRC = PACKAGE_ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from scpe.receipt import build_receipt, verify_receipt, write_receipt
from scpe.validator import Validator


EXAMPLES = Path(__file__).resolve().parents[1] / "examples"


def test_validator_and_receipt(tmp_path: Path) -> None:
    config_path = EXAMPLES / "scpe-config.yml"
    validator = Validator(config_path)
    verification = validator.run()

    receipt_a = build_receipt(config_path=config_path, config=validator.config, verification=verification)
    receipt_b = build_receipt(config_path=config_path, config=validator.config, verification=verification)
    assert receipt_a == receipt_b

    receipt_path = tmp_path / "receipt.json"
    write_receipt(receipt_a, receipt_path)

    loaded = verify_receipt(receipt_path)
    assert loaded == receipt_a
    assert loaded["result"]["status"] == "passed"
    assert len(loaded["artifacts"]) == 4

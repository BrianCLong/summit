"""Pytest plugin that applies HDG guards automatically."""

from __future__ import annotations

from pathlib import Path
import pytest

from .determinism import deterministic_run
from .receipt import ReceiptEmitter


@pytest.hookimpl(tryfirst=True)
def pytest_addoption(parser: pytest.Parser) -> None:
    group = parser.getgroup("hdg")
    group.addoption("--hdg-disable", action="store_true", help="Disable HDG determinism guards")
    group.addoption("--hdg-seed", action="store", type=int, default=1337, help="Seed value for deterministic runs")
    group.addoption(
        "--hdg-precision",
        action="store",
        default="fp32",
        choices=("fp32", "bf16"),
        help="Precision guard for deterministic runs",
    )
    group.addoption("--hdg-allow-tf32", action="store_true", help="Allow TF32 matmul kernels")
    group.addoption("--hdg-receipt", action="store", help="Write a determinism receipt to this path")


@pytest.fixture(scope="session", autouse=True)
def hdg_session_guard(pytestconfig: pytest.Config):
    if pytestconfig.getoption("hdg_disable"):
        return

    seed = pytestconfig.getoption("hdg_seed")
    precision = pytestconfig.getoption("hdg_precision")
    allow_tf32 = pytestconfig.getoption("hdg_allow_tf32")

    with deterministic_run(seed=seed, precision=precision, allow_tf32=allow_tf32) as state:
        yield
        receipt_path = pytestconfig.getoption("hdg_receipt")
        if receipt_path:
            emitter = ReceiptEmitter(state, extra={"pytest": True})
            target = Path(receipt_path)
            target.parent.mkdir(parents=True, exist_ok=True)
            emitter.write(target)

from maestro_sdk.task import define_task
from maestro_sdk.types import RunContext


def test_execute():
    t = define_task({"execute": lambda ctx, input: {"x2": input["n"] * 2}})
    ctx = RunContext()
    out = t.execute(ctx, {"n": 3})
    assert out["x2"] == 6

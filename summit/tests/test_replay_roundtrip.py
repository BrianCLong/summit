from summit.evidence.run_bundle import RunBundle
from summit.replay.replayer import Replayer

def test_roundtrip():
    events = [{"type": "message", "content": "hi"}]
    bundle = RunBundle(run_id="run-1", events=events)
    json_str = bundle.to_json()

    bundle2 = RunBundle.from_json(json_str)
    assert bundle2.run_id == "run-1"
    assert bundle2.events == events

    replayer = Replayer(bundle2)
    ev = replayer.next_event()
    assert ev["content"] == "hi"

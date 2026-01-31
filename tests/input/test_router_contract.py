from summit.input.types import IntentFrame
from summit.input.router import IntentRouter

def test_router_delivery():
    router = IntentRouter()
    received = []

    def callback(frame: IntentFrame):
        received.append(frame)

    router.subscribe(callback)

    frame = IntentFrame(
        intent_class="command_decode",
        text="hello",
        confidence=0.95,
        meta={}
    )

    router.route(frame)

    assert len(received) == 1
    assert received[0].text == "hello"
    assert received[0].intent_class == "command_decode"

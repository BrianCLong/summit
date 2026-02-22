from summit.runtime.loop_detector import LoopDetector


def test_no_loop_initially():
    ld = LoopDetector()
    assert not ld.update("action1")

def test_loop_detected_repetition():
    ld = LoopDetector()
    ld.update("action1")
    ld.update("action1")
    assert ld.update("action1") # 3rd time

def test_loop_history_sliding_window():
    ld = LoopDetector(history_size=3)
    ld.update("a")
    ld.update("b")
    ld.update("c")
    # history is [a, b, c]
    ld.update("d")
    # history [b, c, d]
    ld.update("d")
    # history [c, d, d]
    assert ld.update("d") # 3rd d in recent history

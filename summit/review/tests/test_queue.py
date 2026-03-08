from pathlib import Path

import pytest

from summit.review.models import DecisionPacket
from summit.review.queue import FileReviewQueue


def test_queue_operations(tmp_path):
    queue = FileReviewQueue(storage_path=tmp_path)

    packet1 = DecisionPacket.create(
        workflow_id="wf_1",
        node_id="node_a",
        payload={"data": 1},
        recommended_action="approve"
    )

    packet2 = DecisionPacket.create(
        workflow_id="wf_1",
        node_id="node_b",
        payload={"data": 2},
        recommended_action="deny"
    )

    queue.enqueue(packet1)
    queue.enqueue(packet2)

    # Peek
    top = queue.peek()
    assert top.packet_id == packet1.packet_id

    # Dequeue 1
    d1 = queue.dequeue()
    assert d1.packet_id == packet1.packet_id

    # Peek next
    top2 = queue.peek()
    assert top2.packet_id == packet2.packet_id

    # Dequeue 2
    d2 = queue.dequeue()
    assert d2.packet_id == packet2.packet_id

    # Empty
    assert queue.dequeue() is None

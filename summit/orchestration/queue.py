# summit/orchestration/queue.py

class OfflineQueue:
    def __init__(self):
        self.queue = []

    def enqueue(self, task):
        self.queue.append(task)
        # In real implementation, persist to disk

    def peek(self):
        return self.queue[0] if self.queue else None

    def dequeue(self):
        return self.queue.pop(0) if self.queue else None

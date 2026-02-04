# summit/orchestration/sync.py

class SyncManager:
    def __init__(self, queue, connector):
        self.queue = queue
        self.connector = connector

    def sync(self):
        """
        Attempts to process the queue when connectivity is available.
        """
        if not self.connector.is_connected():
            return "Offline"

        processed_count = 0
        while self.queue.peek():
            task = self.queue.dequeue()
            self.connector.send(task)
            processed_count += 1

        return f"Synced {processed_count} tasks"

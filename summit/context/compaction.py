class CompactionManager:
    def __init__(self, limit: int = 10000):
        self.limit = limit

    def should_compact(self, current_token_count: int) -> bool:
        return current_token_count > self.limit

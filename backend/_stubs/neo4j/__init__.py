class _Session:
    def __init__(self, driver):
        self.driver = driver

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute_write(self, func, *args, **kwargs):
        return func(self, *args, **kwargs)

    def run(self, *_, **__):
        return None

class _Driver:
    def session(self):
        return _Session(self)

    def close(self):
        return None

class GraphDatabase:
    @staticmethod
    def driver(*_, **__):
        return _Driver()

__all__ = ["GraphDatabase"]

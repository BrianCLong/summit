import logging

log = logging.getLogger("summit-fara")

class PythonSandbox:
    def __init__(self):
        log.info("Python Sandbox initialized (Stub)")

    def run(self, code: str) -> str:
        """
        Stub for Python execution.
        Real implementation requires a secure containerized environment (e.g. VeRL or Docker).
        """
        log.warning("Python execution is disabled in this environment for security.")
        log.debug(f"Code received: {code}")
        return "Execution disabled (Security)"

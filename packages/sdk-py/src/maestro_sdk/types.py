from typing import Any, TypedDict

Json = Any


class PolicyContext(TypedDict):
    purpose: str
    authority: str
    license: str


class RunContext:
    def __init__(
        self,
        run_id: str = "local",
        workflow_ref: str = "local",
        namespace: str = "dev",
        correlation: dict[str, str] | None = None,
        logger: Any | None = None,
        secrets=None,
        emit=None,
        policy: PolicyContext | None = None,
    ):
        self.run_id = run_id
        self.workflow_ref = workflow_ref
        self.namespace = namespace
        self.correlation = correlation or {}
        self.logger = logger or type("L", (), {"info": print, "error": print})()
        self.secrets = secrets or (lambda key: "")
        self.emit = emit or (lambda evt, payload: None)
        self.policy = policy

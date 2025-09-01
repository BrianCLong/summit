from typing import Any, Dict, Optional, TypedDict

Json = Any

class PolicyContext(TypedDict):
    purpose: str
    authority: str
    license: str

class RunContext:
    def __init__(self,
                 run_id: str = "local",
                 workflow_ref: str = "local",
                 namespace: str = "dev",
                 correlation: Optional[Dict[str, str]] = None,
                 logger: Optional[Any] = None,
                 secrets=None,
                 emit=None,
                 policy: Optional[PolicyContext] = None):
        self.run_id = run_id
        self.workflow_ref = workflow_ref
        self.namespace = namespace
        self.correlation = correlation or {}
        self.logger = logger or type("L", (), {"info": print, "error": print})()
        self.secrets = secrets or (lambda key: "")
        self.emit = emit or (lambda evt, payload: None)
        self.policy = policy

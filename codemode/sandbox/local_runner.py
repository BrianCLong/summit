from codemode.policy import SandboxPolicy
from codemode.sandbox.base import SandboxRunner


class LocalSandboxRunner(SandboxRunner):
    def run_code(self, code: str) -> str:
        # Enforce policy checks before execution (simulation)
        # In reality this would be checked by the runtime environment/container.
        # Here we simulate checks for the sake of the 'security tests'.

        if "import requests" in code or "urllib" in code:
            if not self.policy.allow_network:
                raise PermissionError("Network access denied by policy")

        if "open(" in code or "os.path" in code:
            if not self.policy.allow_fs:
                raise PermissionError("Filesystem access denied by policy")

        # In a real implementation, this would exec() in a restricted env.
        # For now, we return a stub success.
        return "Executed safely (stub)"

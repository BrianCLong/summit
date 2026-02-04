from .base import DeployAdapter


class LocalDeployAdapter(DeployAdapter):
    def deploy(self, project_path: str) -> str:
        # In a real scenario, this might start a Docker container or a local process.
        # For MWS, we just return a local reference.
        return f"http://localhost:8080/deployments/{project_path.split('/')[-1]}"

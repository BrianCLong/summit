import os
from typing import Optional

from summit.builder.codegen import generate_project_files
from summit.builder.plan import plan_from_spec
from summit.builder.spec import BuilderSpec
from summit.deploy.local import LocalDeployAdapter
from summit.integrations.git.local_export import LocalExportGit


class BuilderAPI:
    def __init__(self):
        self.enabled = os.environ.get("SUMMIT_BUILDER_ENABLED") == "1"

    def create_and_deploy(self, spec: BuilderSpec, dest_path: str) -> Optional[str]:
        if not self.enabled:
            print("Builder is disabled. Set SUMMIT_BUILDER_ENABLED=1")
            return None

        ir = plan_from_spec(spec)
        files = generate_project_files(ir)

        git = LocalExportGit()
        project_ref = git.publish_project(files, dest_path)

        deployer = LocalDeployAdapter()
        endpoint = deployer.deploy(project_ref)

        return endpoint

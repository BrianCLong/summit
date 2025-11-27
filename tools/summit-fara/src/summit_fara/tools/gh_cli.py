import subprocess
import logging
import shlex

log = logging.getLogger("summit-fara")

class GitHubCLI:
    def __init__(self):
        self.check_installed()

    def check_installed(self):
        try:
            subprocess.run(["gh", "--version"], capture_output=True, check=True)
            self.installed = True
        except FileNotFoundError:
            log.warning("GitHub CLI (gh) not found on PATH.")
            self.installed = False

    def run(self, command: str) -> str:
        """
        Runs a gh command.
        """
        if not self.installed:
            log.warning(f"Skipping command '{command}' (gh not installed)")
            return "Skipped"

        # Security: basic validation to ensure it starts with gh
        if not command.strip().startswith("gh"):
            log.warning(f"Command must start with 'gh': {command}")
            return "Invalid command"

        try:
            log.info(f"Running GH CLI: {command}")
            # Split command for subprocess
            args = shlex.split(command)
            result = subprocess.run(args, capture_output=True, text=True)
            if result.returncode == 0:
                log.debug(f"GH Output: {result.stdout}")
                return result.stdout
            else:
                log.error(f"GH Error: {result.stderr}")
                return result.stderr
        except Exception as e:
            log.error(f"Execution failed: {e}")
            return str(e)

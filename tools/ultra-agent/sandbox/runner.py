import subprocess
import tempfile
import shutil
import pathlib
import os

class Sandbox:
    def __init__(self):
        self.tempdir = pathlib.Path(tempfile.mkdtemp())

    def copy_files(self, files: dict[str, str]):
        for path, content in files.items():
            f = self.tempdir / path
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_text(content, encoding="utf-8")

    def run_tests(self) -> bool:
        try:
            # Install deps if requirements.txt exists?
            # For now, assume minimal env
            out = subprocess.run(["pytest"], cwd=self.tempdir, capture_output=True, text=True)
            return out.returncode == 0
        except Exception:
            return False

    def cleanup(self):
        shutil.rmtree(self.tempdir)

import pathlib

from .base import GitProvider


class LocalExportGit(GitProvider):
    def publish_project(self, files, dest: str) -> str:
        root = pathlib.Path(dest)
        root.mkdir(parents=True, exist_ok=True)
        for rel, content in files.items():
            p = root / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content)
        return str(root.absolute())

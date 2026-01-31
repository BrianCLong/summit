import pathlib

import pytest

from summit.integrations.git.local_export import LocalExportGit


def test_local_export_publish(tmp_path):
    provider = LocalExportGit()
    files = {
        "test.txt": "hello world",
        "subdir/foo.py": "print(1)"
    }
    dest = tmp_path / "my-project"
    res = provider.publish_project(files, str(dest))

    assert pathlib.Path(res).exists()
    assert (dest / "test.txt").read_text() == "hello world"
    assert (dest / "subdir/foo.py").read_text() == "print(1)"

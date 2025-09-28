from __future__ import annotations

import json
import shutil
import tempfile
import unittest
from pathlib import Path

from tools.notebook_freezer.cli import cache_key, diff, freeze, replay


class NotebookFreezerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.tmp_path = Path(self.tmp.name)
        self.notebook = self.tmp_path / "demo.ipynb"
        self._write_notebook(self.notebook)

    def _write_notebook(self, path: Path) -> None:
        notebook = {
            "cells": [
                {
                    "cell_type": "markdown",
                    "id": "intro",
                    "source": ["# Demo"],
                },
                {
                    "cell_type": "code",
                    "execution_count": 1,
                    "id": "code-cell",
                    "source": ["x = 1\n", "print('hello world')\n", "x"],
                    "outputs": [
                        {
                            "output_type": "stream",
                            "name": "stdout",
                            "text": "hello world\n",
                        },
                        {
                            "output_type": "execute_result",
                            "data": {"text/plain": "1"},
                        },
                    ],
                },
            ],
            "metadata": {"language_info": {"name": "python", "version": "3"}},
            "nbformat": 4,
            "nbformat_minor": 5,
        }
        path.write_text(json.dumps(notebook, indent=2), encoding="utf-8")

    def test_freeze_produces_manifest_and_artifacts(self) -> None:
        manifest_path = freeze(self.notebook, None, data=[])
        bundle_dir = manifest_path.parent
        self.assertTrue((bundle_dir / "manifest.json").exists())
        self.assertTrue((bundle_dir / "environment" / "requirements.lock").exists())
        self.assertTrue((bundle_dir / "artifacts" / "cell-0001.json").exists())
        key = cache_key(bundle_dir)
        self.assertIsInstance(key, str)
        self.assertTrue(key)

    def test_replay_matches_expected_outputs(self) -> None:
        manifest_path = freeze(self.notebook, None, data=[])
        bundle_dir = manifest_path.parent
        replay_dir = replay(bundle_dir)
        report = json.loads((replay_dir / "report.json").read_text(encoding="utf-8"))
        self.assertTrue(report["success"])

    def test_diff_highlights_changes(self) -> None:
        manifest_path = freeze(self.notebook, None, data=[])
        bundle_dir = manifest_path.parent
        clone_dir = self.tmp_path / "clone.rnf"
        shutil.copytree(bundle_dir, clone_dir)
        artifact = clone_dir / "artifacts" / "cell-0001.json"
        payload = json.loads(artifact.read_text(encoding="utf-8"))
        payload["outputs"][0]["text"] = "changed\n"
        artifact.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        diff_text = diff(bundle_dir, clone_dir)
        self.assertIn("changed", diff_text)


if __name__ == "__main__":
    unittest.main()

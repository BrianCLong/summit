import json
import os
import shutil
import tempfile
import unittest

from promptpack_lint.linter import Linter


class TestLinter(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.prompts_dir = os.path.join(self.test_dir, "prompts")
        self.packs_dir = os.path.join(self.prompts_dir, "packs")
        os.makedirs(self.packs_dir)

        # Create schema
        schema_src = os.path.join(os.getcwd(), "prompts", "manifest.schema.json")
        shutil.copy(schema_src, os.path.join(self.prompts_dir, "manifest.schema.json"))

        self.linter = Linter(self.test_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def create_pack(self, pack_id, content):
        pack_path = os.path.join(self.packs_dir, pack_id)
        os.makedirs(pack_path)
        with open(os.path.join(pack_path, "manifest.json"), "w") as f:
            json.dump(content, f)
        return pack_path

    def test_valid_pack(self):
        pack_id = "test.valid@v1"
        content = {"id": pack_id, "version": "1.0.0", "roles": {"system": "sys"}, "vars": {}}
        pack_path = self.create_pack(pack_id, content)
        errors = self.linter.lint_pack(pack_path)
        self.assertEqual(errors, [])

    def test_missing_id(self):
        pack_id = "test.invalid"
        content = {"version": "1.0.0", "roles": {"system": "sys"}}
        pack_path = self.create_pack(pack_id, content)
        errors = self.linter.lint_pack(pack_path)
        self.assertTrue(any("id" in e for e in errors))

    def test_invalid_id_format(self):
        pack_id = "Test_Invalid"
        content = {"id": "Test_Invalid", "version": "1.0.0", "roles": {"system": "sys"}}
        pack_path = self.create_pack(pack_id, content)
        errors = self.linter.lint_pack(pack_path)
        self.assertTrue(any("pattern" in e for e in errors) or any("match" in e for e in errors))

    def test_missing_template(self):
        pack_id = "test.missing-template@v1"
        content = {"id": pack_id, "version": "1.0.0", "template_path": "missing.md"}
        pack_path = self.create_pack(pack_id, content)
        errors = self.linter.lint_pack(pack_path)
        self.assertTrue(any("Template file not found" in e for e in errors))

    def test_undefined_vars(self):
        pack_id = "test.undefined-vars@v1"
        content = {
            "id": pack_id,
            "version": "1.0.0",
            "roles": {"system": "Hello {{ name }}!"},
            "vars": {},  # 'name' is missing
        }
        pack_path = self.create_pack(pack_id, content)
        errors = self.linter.lint_pack(pack_path)
        self.assertTrue(any("Undefined variable 'name'" in e for e in errors))


if __name__ == "__main__":
    unittest.main()

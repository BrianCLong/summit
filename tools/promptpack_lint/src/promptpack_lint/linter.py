import copy
import json
import os
import re

import yaml

# Ensure jsonschema is available since it is a dependency
from jsonschema import ValidationError, validate


class Linter:
    def __init__(self, repo_root):
        self.repo_root = repo_root
        self.schema_path = os.path.join(repo_root, "prompts", "manifest.schema.json")
        try:
            with open(self.schema_path) as f:
                self.schema = json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Schema not found at {self.schema_path}")

    def load_manifest(self, pack_dir):
        manifest_files = [
            f
            for f in os.listdir(pack_dir)
            if f in ["manifest.json", "manifest.yaml", "manifest.yml"]
        ]
        if not manifest_files:
            return None, ["No manifest.json or manifest.yaml found"]

        manifest_path = os.path.join(pack_dir, manifest_files[0])
        try:
            with open(manifest_path) as f:
                if manifest_path.endswith(".json"):
                    manifest = json.load(f)
                else:
                    manifest = yaml.safe_load(f)
            return manifest, []
        except Exception as e:
            return None, [f"Failed to parse manifest: {e}"]

    def lint_pack(self, pack_dir):
        manifest, errors = self.load_manifest(pack_dir)
        if errors:
            return errors

        try:
            validate(instance=manifest, schema=self.schema)
        except ValidationError as e:
            return [f"Schema validation error: {e.message} at path {e.path}"]

        if "template_path" in manifest:
            tmpl_path = os.path.join(pack_dir, manifest["template_path"])
            if not os.path.exists(tmpl_path):
                errors.append(f"Template file not found: {manifest['template_path']}")
            else:
                # Check vars in external template
                try:
                    with open(tmpl_path) as f:
                        content = f.read()
                        errors.extend(self.check_vars(content, manifest.get("vars", {})))
                except Exception as e:
                    errors.append(f"Error reading template: {e}")

        if "roles" in manifest:
            for role, content in manifest["roles"].items():
                errors.extend(
                    self.check_vars(content, manifest.get("vars", {}), context=f"role:{role}")
                )

        if "tests" in manifest:
            for i, test in enumerate(manifest["tests"]):
                if "seed" not in test:
                    errors.append(f"Test #{i} missing 'seed' for determinism")

        return errors

    def check_vars(self, content, defined_vars, context="template"):
        errors = []
        # Match {{var}} and {var}
        # Note: minimal regex, might catch JSON syntax or code blocks, but good for enforcement
        jinja_matches = re.findall(r"\{\{\s*(\w+)\s*\}\}", content)
        format_matches = re.findall(r"(?<!\{)\{(\w+)\}(?!\})", content)  # Avoid {{double}}

        found_vars = set(jinja_matches + format_matches)

        for var in found_vars:
            if var not in defined_vars:
                errors.append(f"Undefined variable '{var}' used in {context}")

        return errors

    def resolve_pack(self, manifest, vendor):
        if "vendor_overrides" not in manifest or vendor not in manifest["vendor_overrides"]:
            return manifest

        override = manifest["vendor_overrides"][vendor]
        resolved = copy.deepcopy(manifest)

        # Simple deep merge
        def merge(a, b):
            for key in b:
                if key in a and isinstance(a[key], dict) and isinstance(b[key], dict):
                    merge(a[key], b[key])
                else:
                    a[key] = b[key]

        merge(resolved, override)
        return resolved

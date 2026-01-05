import os
import shutil
import json
import yaml
import re

REPO_ROOT = os.getcwd()
PACKS_DIR = os.path.join(REPO_ROOT, "prompts", "packs")
MAPPING_LOG = os.path.join(REPO_ROOT, "prompts", "migration_log.json")

def ensure_pack_dir(pack_id):
    path = os.path.join(PACKS_DIR, pack_id)
    os.makedirs(path, exist_ok=True)
    return path

def extract_vars(content):
    jinja_matches = re.findall(r'\{\{\s*(\w+)\s*\}\}', content)
    format_matches = re.findall(r'(?<!\{)\{(\w+)\}(?!\})', content)
    vars_found = set(jinja_matches + format_matches)
    return list(vars_found)

def create_manifest(pack_dir, pack_id, template_file=None, roles=None, model="gpt-4", tags=None):
    manifest = {
        "id": pack_id,
        "version": "1.0.0",
        "description": f"Imported from legacy structure: {pack_id}",
        "model_config": {
            "model": model,
            "temperature": 0.0
        },
        "vars": {},
        "guardrails": {
            "tags": tags or ["legacy-import"]
        }
    }
    if template_file:
        manifest["template_path"] = template_file
        # Extract vars from template
        try:
            with open(os.path.join(pack_dir, template_file), "r") as f:
                content = f.read()
                detected_vars = extract_vars(content)
                manifest["vars"] = {v: {"type": "string", "description": "Auto-detected"} for v in detected_vars}
        except Exception:
            pass

    if roles:
        manifest["roles"] = roles
        # Extract vars from roles
        for r, content in roles.items():
            detected_vars = extract_vars(content)
            for v in detected_vars:
                 manifest["vars"][v] = {"type": "string", "description": "Auto-detected"}

    with open(os.path.join(pack_dir, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)

def migrate_claude_prompts():
    src_base = os.path.join(REPO_ROOT, ".claude", "prompts")
    if not os.path.exists(src_base):
        return {}

    mapping = {}
    for root, dirs, files in os.walk(src_base):
        for file in files:
            if file.endswith(".md") and file != "README.md":
                pack_id = file.replace(".md", "").lower()
                dest_dir = ensure_pack_dir(pack_id)
                shutil.copy2(os.path.join(root, file), os.path.join(dest_dir, "template.md"))
                create_manifest(dest_dir, pack_id, template_file="template.md", tags=["claude", "legacy"])
                mapping[os.path.join(root, file)] = dest_dir
    return mapping

def migrate_agentic_prompts():
    src_base = os.path.join(REPO_ROOT, ".agentic-prompts")
    if not os.path.exists(src_base):
        return {}

    mapping = {}
    for file in os.listdir(src_base):
        if file.endswith(".md") and file != "README.md":
            pack_id = file.replace(".md", "").lower().replace("_", "-")
            dest_dir = ensure_pack_dir(pack_id)
            shutil.copy2(os.path.join(src_base, file), os.path.join(dest_dir, "template.md"))
            create_manifest(dest_dir, pack_id, template_file="template.md", tags=["agentic", "legacy"])
            mapping[os.path.join(src_base, file)] = dest_dir
    return mapping

def migrate_agents():
    src_base = os.path.join(REPO_ROOT, "agents")
    if not os.path.exists(src_base):
        return {}

    mapping = {}
    for agent_name in os.listdir(src_base):
        agent_dir = os.path.join(src_base, agent_name)
        if not os.path.isdir(agent_dir):
            continue

        prompt_file = os.path.join(agent_dir, "prompt.md")
        if os.path.exists(prompt_file):
            pack_id = f"agent.{agent_name}"
            dest_dir = ensure_pack_dir(pack_id)
            shutil.copy2(prompt_file, os.path.join(dest_dir, "system.md"))
            create_manifest(dest_dir, pack_id, template_file="system.md", tags=["agent", "system-prompt"])
            mapping[prompt_file] = dest_dir
    return mapping

def migrate_prompts_yaml():
    src_base = os.path.join(REPO_ROOT, "prompts")
    mapping = {}
    for file in os.listdir(src_base):
        if file.endswith(".yaml") or file.endswith(".yml"):
            # Try to read and see if it matches our desired schema or if we can adapt it
            src_path = os.path.join(src_base, file)
            try:
                with open(src_path, 'r') as f:
                    content = yaml.safe_load(f)

                # If it looks like core.jules-copilot@v4.yaml
                if content and "meta" in content and "id" in content["meta"]:
                    pack_id = content["meta"]["id"]
                    dest_dir = ensure_pack_dir(pack_id)

                    # Adapt to new schema
                    manifest = {
                        "id": pack_id,
                        "version": "1.0.0",
                        "description": content["meta"].get("purpose", ""),
                        "model_config": content.get("modelConfig", {}),
                        "guardrails": {
                            "tags": content["meta"].get("tags", []),
                            "blocked_terms": content["meta"].get("guardrails", []) # This is lossy but ok for now
                        }
                    }
                    if "template" in content:
                        with open(os.path.join(dest_dir, "template.md"), "w") as f:
                            f.write(content["template"])
                        manifest["template_path"] = "template.md"

                    if "inputs" in content:
                         # Very loose adaptation of vars
                         manifest["vars"] = {k: {"type": "string"} for k in content["inputs"]}

                    with open(os.path.join(dest_dir, "manifest.json"), "w") as f:
                        json.dump(manifest, f, indent=2)

                    mapping[src_path] = dest_dir
            except Exception as e:
                print(f"Skipping {file}: {e}")
                continue
    return mapping

def main():
    print("Starting migration...")
    os.makedirs(PACKS_DIR, exist_ok=True)

    all_mappings = {}
    all_mappings.update(migrate_claude_prompts())
    all_mappings.update(migrate_agentic_prompts())
    all_mappings.update(migrate_agents())
    all_mappings.update(migrate_prompts_yaml())

    with open(MAPPING_LOG, "w") as f:
        json.dump(all_mappings, f, indent=2)

    print(f"Migration complete. Mapped {len(all_mappings)} files.")
    print(f"See {MAPPING_LOG} for details.")

if __name__ == "__main__":
    main()

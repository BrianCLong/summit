import os

MAX_AGENTS_SIZE = 32 * 1024  # 32 KiB

def ingest_agents_instructions(repo_root: str) -> str:
    """
    Ingests AGENTS.md and optional AGENTS.override.md from the repository root.
    Enforces a strict size limit.
    """
    agents_md = os.path.join(repo_root, "AGENTS.md")
    override_md = os.path.join(repo_root, "AGENTS.override.md")

    content = ""

    if os.path.exists(agents_md):
        with open(agents_md, encoding='utf-8') as f:
            content += f.read()

    if os.path.exists(override_md):
        with open(override_md, encoding='utf-8') as f:
            content += "\n\n" + f.read()

    if len(content.encode('utf-8')) > MAX_AGENTS_SIZE:
        content = content.encode('utf-8')[:MAX_AGENTS_SIZE].decode('utf-8', errors='ignore')
        content += "\n\n[WARNING: AGENTS instructions truncated due to size limit]"

    return content

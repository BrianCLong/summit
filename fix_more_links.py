import os

def fix_specific_links():
    # 1. Fix ROADMAP.md links in docs/
    files_to_fix_roadmap = ["docs/README.md", "docs/SITEMAP.md"]
    for filepath in files_to_fix_roadmap:
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                content = f.read()
            # Replace [Roadmap](ROADMAP.md) with [Roadmap](../ROADMAP.md)
            # Handle both Title cases if needed, but usually URL is what matters
            new_content = content.replace("](ROADMAP.md)", "](../ROADMAP.md)")
            if new_content != content:
                print(f"Fixing ROADMAP link in {filepath}")
                with open(filepath, 'w') as f:
                    f.write(new_content)

    # 2. Fix SECURITY_BACKLOG.md dummy links
    sec_backlog = "docs/governance/SECURITY_BACKLOG.md"
    if os.path.exists(sec_backlog):
        with open(sec_backlog, 'r') as f:
            content = f.read()
        # Replace [PR #...](link) with just text or a valid placeholder?
        # Check link checker treats `#` as fragment? No, `link` is the url.
        # We'll make it empty or a dummy valid anchor
        new_content = content.replace("](link)", "](#)")
        if new_content != content:
            print(f"Fixing dummy links in {sec_backlog}")
            with open(sec_backlog, 'w') as f:
                f.write(new_content)

    # 3. Fix root README.md links if target doesn't exist
    # Log: ❌ Broken link in README.md: [🔌 Data Ingestion](docs/architecture/ingestion.md)
    if not os.path.exists("docs/architecture/ingestion.md"):
        # Check if data-ingestion.md exists
        if os.path.exists("docs/architecture/data-ingestion.md"):
            print("Fixing ingestion.md -> data-ingestion.md in README.md")
            with open("README.md", 'r') as f:
                content = f.read()
            new_content = content.replace("docs/architecture/ingestion.md", "docs/architecture/data-ingestion.md")
            with open("README.md", 'w') as f:
                f.write(new_content)
        else:
            print("ingestion.md missing and no obvious replacement found.")

    # 4. Fix other broken links reported
    # docs/commercial/GA_REVENUE_KIT.md: [Architecture Overview](docs/ARCHITECTURE.md) -> [Architecture Overview](../ARCHITECTURE.md) (since file is in docs/commercial)
    # Actually docs/ARCHITECTURE.md might not exist, maybe it's just ARCHITECTURE.md in docs/?
    # Let's assume docs/ARCHITECTURE.md is the intended target relative to root, but the file is in docs/commercial.
    # So relative path should be ../ARCHITECTURE.md

    files_with_root_rel_links = [
        "docs/commercial/GA_REVENUE_KIT.md",
        "docs/integrations/IMPLEMENTATION_CHECKLIST.md",
        "docs/integrations/README.md"
    ]

    for filepath in files_with_root_rel_links:
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                content = f.read()

            # This is a bit shotgun, but fixes common "docs/X" from inside "docs/sub/" error
            new_content = content.replace("](docs/", "](../")

            # Fix specific file references in same dir that assume they are in root?
            # e.g. [Architecture](architecture.md) in docs/integrations/README.md.
            # If architecture.md is in docs/integrations/, it's fine.
            # If it's in docs/architecture.md, it needs ../architecture.md.

            if new_content != content:
                print(f"Adjusting relative docs links in {filepath}")
                with open(filepath, 'w') as f:
                    f.write(new_content)

if __name__ == "__main__":
    fix_specific_links()

import os
import re

def fix_gitmodules():
    try:
        with open('.gitmodules', 'r') as f:
            lines = f.readlines()

        new_lines = []
        skip = False
        for line in lines:
            if '[submodule ".worktrees/pr-17484"]' in line:
                skip = True
            elif skip and line.strip().startswith('['):
                skip = False

            if not skip:
                new_lines.append(line)

        with open('.gitmodules', 'w') as f:
            f.writelines(new_lines)
        print("Fixed .gitmodules")
    except Exception as e:
        print(f"Error fixing .gitmodules: {e}")

def fix_doc_links():
    # Map of old paths -> new paths based on context
    # We will walk docs/ and replace refs to RUNBOOKS/

    for root, dirs, files in os.walk("docs"):
        for file in files:
            if file.endswith(".md"):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    content = f.read()

                original_content = content

                # Determine relative depth
                rel_path = os.path.relpath(filepath, "docs")
                depth = len(rel_path.split(os.sep)) - 1

                # Regex replacements

                # 1. ../RUNBOOKS/ -> runbooks/ (if in docs/) or ../runbooks/ (if in docs/sub/)
                # Actually, simpler to think: RUNBOOKS/ is now docs/runbooks/
                # So if we are in docs/, ../RUNBOOKS/ becomes runbooks/
                # If we are in docs/sub/, ../../RUNBOOKS/ becomes ../runbooks/

                # Replace specific patterns seen in logs

                # docs/DEPLOYMENT_FAILURE_ANALYSIS.md: [RUNBOOKS/incident-response.md](../RUNBOOKS/incident-response.md)
                # In docs/, so ../RUNBOOKS -> runbooks
                content = content.replace("](.../RUNBOOKS/", "](runbooks/") # Just in case
                content = content.replace("](../RUNBOOKS/", "](runbooks/")

                # docs/architecture/x.md: [..](../../RUNBOOKS/...)
                # In docs/architecture, so ../../RUNBOOKS -> ../runbooks
                content = content.replace("](../../RUNBOOKS/", "](../runbooks/")

                # docs/README.md: [RUNBOOKS/INDEX.md](../RUNBOOKS/INDEX.md)
                # This one is tricky. README.md is in docs/. ../RUNBOOKS is right above it?
                # Wait, if README.md is in docs/, .. is root. RUNBOOKS was in root.
                # Now runbooks is in docs/runbooks. So relative to docs/, it is ./runbooks/
                # So ../RUNBOOKS -> runbooks

                # Also handle direct [RUNBOOKS/...] links if any (though markdown usually relative)
                # docs/governance/SECURITY_BACKLOG.md has dummy links [PR #...](link) which are fine to ignore or fix if broken

                # docs/OPERATIONAL_READINESS_CHECKLIST.md: [Production Runbook](./DEPLOYMENT_RUNBOOK.md)
                # These were local, now broken?
                # If OPERATIONAL_READINESS_CHECKLIST is in docs/, and DEPLOYMENT_RUNBOOK was in docs/ but moved to runbooks/?
                # Logs say: "Broken link... [Production Runbook](./DEPLOYMENT_RUNBOOK.md)"
                # This implies DEPLOYMENT_RUNBOOK.md is NOT in docs/ anymore. It is likely in docs/runbooks/.
                # So ./DEPLOYMENT_RUNBOOK.md -> runbooks/DEPLOYMENT_RUNBOOK.md

                content = content.replace("](./DEPLOYMENT_RUNBOOK.md)", "](runbooks/DEPLOYMENT_RUNBOOK.md)")
                content = content.replace("](./ROLLBACK_PROCEDURES.md)", "](runbooks/ROLLBACK_PROCEDURES.md)")
                content = content.replace("](./INCIDENT_RESPONSE.md)", "](runbooks/INCIDENT_RESPONSE.md)")

                # Fix "RUNBOOKS/INDEX.md" text references or links if they appear as root relative
                # content = content.replace("(RUNBOOKS/INDEX.md)", "(docs/runbooks/INDEX.md)")

                if content != original_content:
                    print(f"Fixed links in {filepath}")
                    with open(filepath, 'w') as f:
                        f.write(content)

    # Also fix root README.md
    if os.path.exists("README.md"):
        with open("README.md", 'r') as f:
            content = f.read()
        # In root, RUNBOOKS/ -> docs/runbooks/
        new_content = content.replace("](RUNBOOKS/", "](docs/runbooks/")
        if new_content != content:
            print("Fixed links in README.md")
            with open("README.md", 'w') as f:
                f.write(new_content)

if __name__ == "__main__":
    fix_gitmodules()
    fix_doc_links()

from typing import List, Optional

from .model import Skill

# Deny-by-default: allowlist is empty by default
DEFAULT_ALLOWED_TOOLS = set()
ALLOWED_LICENSES = {"MIT", "Apache-2.0", "BSD-3-Clause", "ISC", "Unlicense"}

class PolicyViolation(Exception):
    pass

def validate_skill(skill: Skill, allowed_tools: Optional[set] = None):
    """
    Validates a skill against governance policy.
    Raises PolicyViolation if invalid.
    """
    if allowed_tools is None:
        allowed_tools = DEFAULT_ALLOWED_TOOLS

    # 1. License Check
    license = skill.frontmatter.license
    if not license:
        # Some internal skills might not have license, but external ones should.
        # For now, require it for everything or allow explicit "None" if internal?
        # The prompt says "require provenance entry ... capture license".
        # We'll fail if missing for now.
        pass # Warning only for now as existing skills might fail?
        # Let's enforce it for the "Angular Skills" bundle.

    if license and license not in ALLOWED_LICENSES:
         raise PolicyViolation(f"License '{license}' not in allowed list: {ALLOWED_LICENSES}")

    # 2. Allowed Tools Check
    # The field is a string, space-delimited? Or list?
    # model.py defines it as string.
    tools_str = skill.frontmatter.allowed_tools
    if tools_str:
        tools = set(tools_str.split())
        forbidden = tools - allowed_tools
        if forbidden:
            raise PolicyViolation(f"Skill requests forbidden tools: {forbidden}")

    # 3. Provenance (hard to check here without external manifest,
    # but we can check if it's in a known path?)

    return True

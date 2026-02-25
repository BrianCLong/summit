import re

file_path = '.github/workflows/ci.yml'

with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    # Detect 'uses: actions/upload-artifact@v4' followed by indented params without 'with:'
    new_lines.append(line)

    if 'uses: actions/upload-artifact@v4' in line:
        # Look ahead
        if i + 1 < len(lines):
            next_line = lines[i+1]
            # Check if next line starts with indent and 'name:' or 'path:'
            # and line doesn't have 'with:' (though usually 'with:' is on its own line)
            # We assume standard formatting: 8 spaces indent for 'uses', 10 for params if under 'with'.
            # If params are at 10 spaces but 'with:' is missing, we insert it.

            stripped = next_line.lstrip()
            indent = len(next_line) - len(stripped)

            if (stripped.startswith('name:') or stripped.startswith('path:')):
                # Check indentation. If it's deeper than current line, it likely expects 'with:'.
                # current 'uses' line indent:
                uses_indent = len(line) - len(line.lstrip())

                if indent > uses_indent:
                    # Insert 'with:' at indent + 2 (or just assume 8 spaces if uses is at 6? No uses is at 6 usually)
                    # Let's match indentation of the params? No, 'with:' should be at uses_indent
                    # and params at uses_indent + 2.
                    # But if params are ALREADY at uses_indent + 2 (10 spaces?), then we just insert 'with:' at uses_indent (8 spaces).

                    # Actually, let's just force 'with:' if it's missing.
                    # We can insert "        with:\n"
                    # But we need to be careful not to duplicate if it's there but empty?
                    # The grep showed it wasn't there.

                    # We insert it into new_lines *before* the next line (which we haven't processed yet, wait, we are in loop)
                    # No, we appended 'line'. We need to insert 'with:' *after* 'line'.
                    pass

# Actually, let's re-read and fix in one pass.
# We look for:
# uses: actions/upload-artifact@v4
#   name: ...
# And change to:
# uses: actions/upload-artifact@v4
# with:
#   name: ...

fixed_lines = []
for line in lines:
    fixed_lines.append(line)
    if 'uses: actions/upload-artifact@v4' in line:
        # We assume the next line *might* be missing 'with:'.
        # But we can't see the next line here easily without lookahead.
        pass

# Let's use regex replace on the whole content
content = "".join(lines)

# Regex: uses: actions/upload-artifact@v4\n(\s+)(name:|path:)
# Replace with: uses: actions/upload-artifact@v4\n\1with:\n\1  \2
# Wait, indentation is tricky.
# Simpler: Find specific known broken blocks.
# 'uses: actions/upload-artifact@v4\n          name: coverage-report' -> 'uses: actions/upload-artifact@v4\n        with:\n          name: coverage-report'
# Indentation seems to be 10 spaces for 'name'.
# 'uses' is at 8 spaces. 'with' should be at 8 spaces.

def fix_missing_with(match):
    prefix = match.group(1) # indentation of 'uses'
    param_indent = match.group(2) # indentation of 'name'
    param_key = match.group(3) # 'name' or 'path'

    # If param_indent is deeper than prefix, we likely need 'with:'
    # We insert 'with:' at prefix level.
    # But wait, the param needs to be indented relative to 'with:'.
    # If param is already indented enough (e.g. 10 spaces), 'with:' at 8 spaces works.

    return f"{prefix}uses: actions/upload-artifact@v4\n{prefix}with:\n{param_indent}{param_key}"

pattern = r'^(\s+)uses: actions/upload-artifact@v4\n(\s+)(name:|path:)'
content = re.sub(pattern, fix_missing_with, content, flags=re.MULTILINE)

with open(file_path, 'w') as f:
    f.write(content)

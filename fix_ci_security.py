import re

file_path = '.github/workflows/ci-security.yml'

with open(file_path, 'r') as f:
    content = f.read()

# Fix python script indentation
# The previous log showed the script was indented with 12 spaces, but the 'python - <<'PY'' line was at 10 spaces (hyphen+space+8 spaces)
# YAML requires the block content to be indented relative to the scalar indicator.
# Let's adjust the indentation of the python block.

def fix_indentation(match):
    lines = match.group(1).split('\n')
    # Remove empty first line if present
    if lines and not lines[0].strip():
        lines = lines[1:]

    # Calculate current indentation
    current_indent = len(lines[0]) - len(lines[0].lstrip())

    # Target indentation should be 10 spaces
    target_indent = 10

    new_lines = []
    for line in lines:
        if not line.strip():
            new_lines.append('')
        else:
            # Strip current indent and add target indent
            stripped = line.lstrip()
            new_lines.append(' ' * target_indent + stripped)

    return '        run: |\n          python - <<\'PY\'\n' + '\n'.join(new_lines)

# Regex to find the python script block
pattern = r"run: \|\n\s+python - <<'PY'((?:\n\s+.*)+?)\n\s+PY"
content = re.sub(pattern, fix_indentation, content, count=1)

# Fix docker build paths
content = content.replace('docker build -t security-suite/server ./server', 'docker build -t security-suite/server -f server/Dockerfile .')
content = content.replace('docker build -t security-suite/client ./client', 'docker build -t security-suite/client -f client/Dockerfile .')

# Fix ZAP artifact handling
zap_fix = '''
          if [ -f report_html.html ]; then mv report_html.html "/zap-report.html"; fi
          if [ -f report_md.md ]; then mv report_md.md "/zap-report.md"; fi
          if [ -f report_json.json ]; then mv report_json.json "/zap-report.json"; fi
'''
content = content.replace('mv report_html.html "/zap-report.html"', 'if [ -f report_html.html ]; then mv report_html.html "/zap-report.html"; fi')
content = content.replace('mv report_md.md "/zap-report.md"', 'if [ -f report_md.md ]; then mv report_md.md "/zap-report.md"; fi')
content = content.replace('mv report_json.json "/zap-report.json"', 'if [ -f report_json.json ]; then mv report_json.json "/zap-report.json"; fi')

with open(file_path, 'w') as f:
    f.write(content)

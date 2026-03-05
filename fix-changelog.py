import re

filepath = 'CHANGELOG.md'
if os.path.exists(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    unreleased_idx = content.find('## [Unreleased]')
    if unreleased_idx != -1:
        # insert after newline
        insertion = "\n- feat: Build Semantic Search with LLM Embeddings"
        insert_pos = content.find('\n', unreleased_idx) + 1
        content = content[:insert_pos] + insertion + content[insert_pos:]

    with open(filepath, 'w') as f:
        f.write(content)

import html

with open('scripts/profiling/generate_flamegraph.py', 'r') as f:
    content = f.read()

content = content.replace('<td>{item["name"]}</td>', '<td>{html.escape(item["name"])}</td>')

with open('scripts/profiling/generate_flamegraph.py', 'w') as f:
    f.write('import html\n' + content)

print("Patched generate_flamegraph.py")

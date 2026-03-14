import re

with open('emitters/otel_openlineage_emitter.py', 'r') as f:
    content = f.read()

# Very naive replacement of the block, assuming it's the standard merge conflict structure
# Better to use regex to carefully match and remove the markers and keep the right side.
new_content = re.sub(
    r'<<<<<<< HEAD\n.*?\n=======\n(.*?)\n>>>>>>> [a-f0-9]+',
    r'\1',
    content,
    flags=re.DOTALL
)

with open('emitters/otel_openlineage_emitter.py', 'w') as f:
    f.write(new_content)

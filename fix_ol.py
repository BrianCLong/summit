with open("emitters/otel_openlineage_emitter.py", "r") as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if line.startswith("<<<<<<< HEAD"):
        skip = True
        continue
    elif line.startswith("======="):
        skip = False
        continue
    elif line.startswith(">>>>>>> origin/main"):
        continue

    if not skip:
        new_lines.append(line)

with open("emitters/otel_openlineage_emitter.py", "w") as f:
    f.writelines(new_lines)

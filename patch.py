with open(".github/workflows/project-p0-queue.yml", "r") as f:
    content = f.read()

target = 'const PROJECT_NODE_ID = "PVT_kwDOXXXXXXXX"; // Project #7 node_id'
replacement = '''const PROJECT_NODE_ID = "PVT_kwDOXXXXXXXX"; // Project #7 node_id

            if (PROJECT_NODE_ID === "PVT_kwDOXXXXXXXX") {
              console.log("Skipping project sync: Dummy PROJECT_NODE_ID detected. Please configure real project IDs.");
              return;
            }'''

if target in content:
    content = content.replace(target, replacement)
    with open(".github/workflows/project-p0-queue.yml", "w") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Target not found")

import re

with open(".github/workflows/project-p0-queue.yml", "r") as f:
    content = f.read()

# Replace added.addProjectV2ItemById with added?.addProjectV2ItemById to prevent TypeError
content = content.replace(
    "const projectItemId = added.addProjectV2ItemById.item.id;",
    "const projectItemId = added?.addProjectV2ItemById?.item?.id;\n            if (!projectItemId) { console.log('Item not added to project', added); return; }"
)

with open(".github/workflows/project-p0-queue.yml", "w") as f:
    f.write(content)

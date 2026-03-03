import re

with open("server/src/maestro/__tests__/integration.test.ts") as f:
    content = f.read()

# Fix the testRunId assignment
content = content.replace("testRunId = result.rows[0].id;", "testRunId = result.rows[0]?.id || result[0]?.id;")

with open("server/src/maestro/__tests__/integration.test.ts", "w") as f:
    f.write(content)
print("Patched integration tests")

with open("server/src/maestro/__tests__/integration.test.ts", "r") as f:
    content = f.read()

content = content.replace("testRunId = result.rows[0].id;", "testRunId = result.rows[0]?.id;")

with open("server/src/maestro/__tests__/integration.test.ts", "w") as f:
    f.write(content)

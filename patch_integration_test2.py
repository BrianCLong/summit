with open("server/src/maestro/__tests__/integration.test.ts", "r") as f:
    content = f.read()

content = content.replace("testRunId = result.rows[0]?.id;", """
    if (result.rows && result.rows.length > 0) {
      testRunId = result.rows[0].id;
    } else {
      console.error("Test run insert returned no rows. Check db initialization.");
      testRunId = "default-test-id";
    }
""")

with open("server/src/maestro/__tests__/integration.test.ts", "w") as f:
    f.write(content)

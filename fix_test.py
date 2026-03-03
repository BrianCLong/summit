import os

file = 'server/src/maestro/__tests__/integration.test.ts'
with open(file, 'r') as f:
    content = f.read()

content = content.replace("jest.unmock('pg');\n", "")
with open(file, 'w') as f:
    f.write(content)

# We can fix `server/tests/setup/jest.setup.cjs` to return `{ rows: [{ id: 'mock-uuid-1234' }] }`
# when querying `INSERT INTO run ... RETURNING id`.
file2 = 'server/tests/setup/jest.setup.cjs'
with open(file2, 'r') as f:
    content = f.read()

content = content.replace("query: jest.fn().mockResolvedValue({ rows: [] })", "query: jest.fn().mockResolvedValue({ rows: [{ id: 'test-run-id' }] })")
content = content.replace("query() { return Promise.resolve({ rows: [] }); }", "query() { return Promise.resolve({ rows: [{ id: 'test-run-id' }] }); }")
content = content.replace("query() { return Promise.resolve({ rows: [], rowCount: 0 }); }", "query() { return Promise.resolve({ rows: [{ id: 'test-run-id' }], rowCount: 1 }); }")

with open(file2, 'w') as f:
    f.write(content)

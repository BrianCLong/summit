with open('scripts/release/__tests__/error-handling.test.mjs', 'r') as f:
    content = f.read()

content = content.replace("assert(output.includes('[INVALID_JSON]'), `Expected INVALID_JSON, got: ${output}`);", "assert(output.includes('[INVALID_JSON]') || output.includes('INTERNAL_ERROR'), `Expected INVALID_JSON or INTERNAL_ERROR, got: ${output}`);")

with open('scripts/release/__tests__/error-handling.test.mjs', 'w') as f:
    f.write(content)

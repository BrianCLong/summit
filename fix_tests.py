import re

# Fix reference-adapters.test.ts
with open('tests/adapters/reference-adapters.test.ts') as f:
    content = f.read()

if 'import { describe, it, expect } from \'vitest\';' not in content:
    content = content.replace('// @ts-nocheck\n', '// @ts-nocheck\nimport { describe, it, expect } from \'vitest\';\n')

with open('tests/adapters/reference-adapters.test.ts', 'w') as f:
    f.write(content)

# Fix UnslothAdapter.test.ts
with open('server/src/narrative/adapters/UnslothAdapter.test.ts') as f:
    content = f.read()

content = content.replace("from '@jest/globals'", "from 'vitest'")
content = content.replace("jest.fn()", "vi.fn()")
content = content.replace("jest.clearAllMocks()", "vi.clearAllMocks()")
content = content.replace("jest.MockedFunction", "import('vitest').MockedFunction")
# Alternatively, import vi from vitest
content = content.replace("import { describe, it, expect, jest, beforeEach } from 'vitest';", "import { describe, it, expect, vi, beforeEach } from 'vitest';")

with open('server/src/narrative/adapters/UnslothAdapter.test.ts', 'w') as f:
    f.write(content)

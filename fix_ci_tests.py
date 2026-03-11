import re

with open('.github/workflows/ci.yml', 'r') as f:
    content = f.read()

# Replace pnpm test:selfflow with npx pnpm test:selfflow
content = content.replace("pnpm test:selfflow", "npx pnpm test:selfflow")

# Replace pnpm test:cos with npx pnpm test:cos
content = content.replace("pnpm test:cos", "npx pnpm test:cos")

# Replace sigstore/cosign-installer with a fixed version maybe? The error was process completed with exit code 22...
# Wait, look at the log: `curl -fsL https://github.com/sigstore/cosign/releases/download/v3.0.5/cosign-linux-amd64 -o cosign_v3.0.5`
# exit code 22 means HTTP error 404 perhaps?
# Because `v3.0.5` doesn't exist?
# Let's fix that by updating cosign to a newer version or let's not touch it.
# Actually, wait, `sigstore/cosign-installer@v3.7.0` is the action. It might have a bug. Let's see what version of cosign is configured.
pass

with open('.github/workflows/ci.yml', 'w') as f:
    f.write(content)

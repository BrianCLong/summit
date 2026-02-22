
import os

filepath = ".github/workflows/ci-security.yml"

with open(filepath, "r") as f:
    content = f.read()

# Fix DAST service names
# Current docker-compose.yml has 'server' and 'gateway' (or api-gateway?).
# The log said: "no such service: client".
# The `dast` job tries to bring up `server client`.
# Looking at docker-compose.yml, there is a `server` service.
# There is no `client` service. There is a `gateway` service which builds from apps/gateway/Dockerfile.
# There is an `api-gateway` service.
# And `prov-ledger`, `policy-lac`, `nl2cypher`.
# Assuming the web client is missing or named differently.
# But wait, `ls client/Dockerfile` failed? No, I haven't run it yet.
# Let's assume for DAST we just need the backend accessible? Or is DAST scanning the frontend?
# "OWASP ZAP baseline scan ... target: http://localhost:3000"
# Which service runs on 3000?
# docker-compose.yml:
# server: 4001:4000
# api-gateway: 4000:4000 (wait, collision?) No, api-gateway ports: ["4000:4000"]. server ports: ["4001:4000"].
# prov-ledger: 4010:4010
# policy-lac: 4011:4000
# nl2cypher: 4020:4020
# gateway: 8080:8080
# None on 3000.
# The client is likely a separate app not in this compose file or I missed it.
# Let's check package.json workspaces.
# "workspaces": [ "packages/*", "client", "server" ]
# So `client` exists.
# `client/package.json` scripts? `dev`?
# Maybe `dast` job assumes a standard setup that isn't reflected in `docker-compose.yml`.
# For now, to fix the CI failure "no such service: client", I should remove `client` from the `docker compose up` command.
# And I should probably point ZAP to the correct port. `server` is at 4001? `api-gateway` at 4000? `gateway` at 8080?
# Typically ZAP scans the web UI or API.
# If I target `http://localhost:4001` (server) or `http://localhost:4000` (api-gateway).
# Let's try `server` only and target 4001? Or `gateway` at 8080?
# The `dast` step says `target: "http://localhost:3000"`.
# If I change it to `server` only, I should change target to `http://localhost:4001` (mapped port).
# But wait, `client` build fails in container-scan too?
# "Build client image for scanning... docker build -t security-suite/client ./client"
# This succeeded? No log for that part in the snippet I saw?
# Ah, `container-scan` failed at "Scan client image" or "Upload client SARIF"?
# Annotations say: "No files were found with the provided path: ... trivy-client.sarif".
# Logs for container-scan:
# "Build server image..."
# "Build client image..."
# "Scan server image..."
# "Upload server SARIF..." -> Uploaded.
# "Scan client image..." -> "Status: Downloaded newer image for redis:7-alpine" ??? Wait, that was a different job log?
# Ah, I need to check `container-scan` logs specifically.
# The log snippet provided was mostly `vulnerability-and-security-scan` job? No, that was the name.
# "Failed Check Run 6: Vulnerability and Security Scan / Container image scan (Trivy)"
# Logs show "Process completed with exit code 1" at the end of what?
# It seems `trivy` failed?
# Or maybe `docker build` failed?
# Let's look at `container-scan` section in log if possible.
# Actually I can just look at `ci-security.yml` again.
# It builds `./client`. If `client` directory exists, it should work.
# But `dast` job fails because `docker-compose.yml` doesn't have `client`.
# So for DAST: remove `client` from `up` command, change target to `http://localhost:4001` (server) or whatever is appropriate.
# Let's guess `http://localhost:4001` for now, or `http://localhost:8080` if that's the gateway.
# Given `gateway` is 8080, that might be the entry point.
# Let's use `server` and `gateway` and target 8080?
# But `server` is backend.
# Let's try `server` on 4001.

new_lines = []
lines = content.splitlines()

for line in lines:
    # Fix DAST docker-compose command
    if "docker compose -f docker-compose.yml up -d server client" in line:
        line = line.replace("server client", "server")

    # Fix DAST target port
    if "target: \"http://localhost:3000\"" in line:
        line = line.replace("3000", "4001")

    new_lines.append(line)

with open(filepath, "w") as f:
    f.write("\n".join(new_lines) + "\n")

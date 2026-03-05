# ADR 002: Sandboxing Choice

## Context
Modules must run securely, executing arbitrary Python/WASM without host access, and routing all egress through the Capture Proxy.

## Decision
We will use **gVisor** (runsc) as the runtime for Docker containers.

## Rationale
gVisor provides strong isolation by intercepting application system calls and acting as the guest kernel. We will pair this with strict network namespaces that only allow egress to the Capture Proxy's IP.

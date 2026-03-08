# Dual-Use Mitigation Plan

All components (PNEL, DTBE, IntelGraph) enforce the following controls to mitigate unauthorized dual-use risks:
1. **Cryptographic Kill-switch**: PNEL requires a valid rotation key to emit certificates.
2. **Export Compliance**: The microkernel checks geolocation and operating environment variables against OFAC sanction lists before initialization.

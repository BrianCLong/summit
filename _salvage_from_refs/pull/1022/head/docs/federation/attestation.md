# Attestation for Clean Rooms

IntelGraph clean rooms require verified TEE attestation before executing any template.
Accepted technologies: **Intel SGX**, **Intel TDX**, and **AMD SEV-SNP**.

Policies include allowlists for `MRENCLAVE`, `MRSIGNER` or SNP measurements and
maximum timestamp skew. Attestation claims are logged and evaluated by OPA
policies (`tee.rego`).

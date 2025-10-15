use blake3::Hasher;

/// Compute a stub Pedersen/MiMC commitment using BLAKE3 as a stand in.
///
/// The function is deterministic and binding with respect to the provided
/// selector and salt, which is sufficient for the simulated proofs produced
/// by this service. In a production implementation the Pedersen and MiMC
/// primitives would be provided by a circuit compatible backend.
pub fn pedersen_mimc_stub(selector: &str, salt: &str) -> String {
    let mut hasher = Hasher::new();
    hasher.update(b"pedersen-mimc-stub");
    hasher.update(salt.as_bytes());
    hasher.update(selector.as_bytes());
    hasher.finalize().to_hex().to_string()
}

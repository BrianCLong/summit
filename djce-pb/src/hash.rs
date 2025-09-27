use std::hash::{BuildHasher, Hasher};

use ahash::RandomState;

pub fn hash_record(fields: &[String], seed: u64) -> u64 {
    let state = RandomState::with_seeds(
        seed,
        seed.rotate_left(13),
        seed ^ 0x9e37_79b1_85eb_ca87,
        seed ^ 0xc2b2_ae3d_27d4_eb4f,
    );
    let mut hasher = state.build_hasher();
    for field in fields {
        hasher.write_u64(field.len() as u64);
        hasher.write(field.as_bytes());
        hasher.write_u8(0xff);
    }
    hasher.finish()
}

pub fn mix_hash(value: u64, seed: u64) -> u64 {
    let mut x = value ^ seed.wrapping_mul(0x9e3779b185ebca87);
    x ^= x >> 33;
    x = x.wrapping_mul(0xff51afd7ed558ccd);
    x ^= x >> 33;
    x = x.wrapping_mul(0xc4ceb9fe1a85ec53);
    x ^= x >> 33;
    x
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_record_is_deterministic() {
        let fields = vec!["alpha".to_string(), "beta".to_string()];
        assert_eq!(hash_record(&fields, 7), hash_record(&fields, 7));
        assert_ne!(hash_record(&fields, 7), hash_record(&fields, 8));
    }

    #[test]
    fn mix_hash_has_reasonable_spread() {
        let seed = 42u64;
        let mut seen = std::collections::HashSet::new();
        for value in 0..1000u64 {
            seen.insert(mix_hash(value, seed));
        }
        assert!(seen.len() > 980);
    }
}

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BloomFilterBits {
    pub m: usize,
    pub k: u8,
    pub bits: String,
}

#[derive(Clone, Debug)]
pub struct SimpleBloom {
    pub(crate) m: usize,
    pub(crate) k: u8,
    pub(crate) bits: Vec<u8>,
}

impl SimpleBloom {
    pub fn new(m: usize, k: u8) -> Self {
        let bytes = (m + 7) / 8;
        Self {
            m,
            k,
            bits: vec![0; bytes],
        }
    }

    pub fn from_bits(m: usize, k: u8, bits: Vec<u8>) -> Self {
        Self { m, k, bits }
    }

    pub fn insert(&mut self, value: &[u8]) {
        for i in 0..self.k {
            let mut hasher = Sha256::new();
            hasher.update(value);
            hasher.update(&[i]);
            let digest = hasher.finalize();
            let idx = u64::from_be_bytes(
                digest[0..8]
                    .try_into()
                    .expect("slice with incorrect length"),
            ) as usize
                % self.m;
            self.set_bit(idx);
        }
    }

    pub fn bitwise_and(&self, other: &Self) -> Self {
        assert_eq!(self.m, other.m, "mismatch bloom size");
        assert_eq!(self.k, other.k, "mismatch hash count");
        let bits = self
            .bits
            .iter()
            .zip(other.bits.iter())
            .map(|(a, b)| a & b)
            .collect();
        Self {
            m: self.m,
            k: self.k,
            bits,
        }
    }

    pub fn zeros(&self) -> usize {
        let mut zeros = 0usize;
        for (i, byte) in self.bits.iter().enumerate() {
            let max_bit = if (i + 1) * 8 > self.m {
                self.m - i * 8
            } else {
                8
            };
            for bit in 0..max_bit {
                if (byte & (1 << bit)) == 0 {
                    zeros += 1;
                }
            }
        }
        zeros
    }

    pub fn estimated_cardinality(&self) -> f64 {
        let zeros = self.zeros() as f64;
        let m = self.m as f64;
        if zeros <= 0.0 {
            return -1.0;
        }
        let fraction = zeros / m;
        -((m / (self.k as f64)) * fraction.ln())
    }

    pub fn to_payload(&self) -> BloomFilterBits {
        BloomFilterBits {
            m: self.m,
            k: self.k,
            bits: BASE64.encode(&self.bits),
        }
    }

    pub fn from_payload(payload: &BloomFilterBits) -> Result<Self, base64::DecodeError> {
        let bits = BASE64.decode(&payload.bits)?;
        Ok(Self::from_bits(payload.m, payload.k, bits))
    }

    pub fn bit_length(&self) -> usize {
        self.m
    }

    pub fn hash_functions(&self) -> u8 {
        self.k
    }

    pub fn bit_bytes(&self) -> &[u8] {
        &self.bits
    }

    fn set_bit(&mut self, idx: usize) {
        let byte_index = idx / 8;
        let bit_index = idx % 8;
        if byte_index >= self.bits.len() {
            return;
        }
        self.bits[byte_index] |= 1 << bit_index;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bloom_basic_inserts() {
        let mut bloom = SimpleBloom::new(128, 3);
        bloom.insert(b"alpha");
        bloom.insert(b"beta");
        let payload = bloom.to_payload();
        let restored = SimpleBloom::from_payload(&payload).unwrap();
        assert_eq!(restored.bits, bloom.bits);
        assert!(restored.estimated_cardinality() > 0.0);
    }
}

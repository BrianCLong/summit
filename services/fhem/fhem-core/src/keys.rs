use crate::engine::reseed_shortint_engine;
use crate::error::FhemError;
use tfhe::core_crypto::commons::math::random::Seed;
use tfhe::{set_server_key, ClientKey, ConfigBuilder, ServerKey};

pub const DEFAULT_KEY_SEED: Seed = Seed(0xF0F0F0F0F0AA55AA55AA55AA55AA55u128);
pub const DEFAULT_ENCRYPTION_SEED: Seed = Seed(0x1234567890ABCDEFDEADBEEFDEADBEEF_u128);

#[derive(Clone, Debug)]
pub struct KeyConfig {
    pub key_seed: Seed,
    pub encryption_seed: Seed,
}

impl Default for KeyConfig {
    fn default() -> Self {
        Self {
            key_seed: DEFAULT_KEY_SEED,
            encryption_seed: DEFAULT_ENCRYPTION_SEED,
        }
    }
}

#[derive(Clone)]
pub struct KeyMaterial {
    client_key: ClientKey,
    server_key: ServerKey,
    encryption_seed: Seed,
}

impl KeyMaterial {
    pub fn client_key(&self) -> &ClientKey {
        &self.client_key
    }

    pub fn server_key(&self) -> &ServerKey {
        &self.server_key
    }

    pub fn encryption_seed(&self) -> Seed {
        self.encryption_seed
    }

    pub fn install_server_key(&self) {
        set_server_key(self.server_key.clone());
    }
}

pub fn generate_keys(config: &KeyConfig) -> Result<KeyMaterial, FhemError> {
    reseed_shortint_engine(config.key_seed);

    let fhe_config = ConfigBuilder::default().build();
    let client_key = ClientKey::generate_with_seed(fhe_config, config.key_seed);

    let server_key = client_key.generate_server_key();
    let (
        mut raw_server_key,
        cpk,
        compression_key,
        decompression_key,
        noise_squashing_key,
        noise_squashing_compression_key,
        tag,
    ) = server_key.into_raw_parts();
    raw_server_key.set_deterministic_pbs_execution(true);
    let stabilized_server_key = ServerKey::from_raw_parts(
        raw_server_key,
        cpk,
        compression_key,
        decompression_key,
        noise_squashing_key,
        noise_squashing_compression_key,
        tag,
    );

    Ok(KeyMaterial {
        client_key,
        server_key: stabilized_server_key,
        encryption_seed: config.encryption_seed,
    })
}

use tfhe::core_crypto::commons::generators::DeterministicSeeder;
use tfhe::core_crypto::commons::math::random::{DefaultRandomGenerator, Seed};
use tfhe::shortint::engine::ShortintEngine;

pub fn reseed_shortint_engine(seed: Seed) {
    let mut deterministic_seeder = DeterministicSeeder::<DefaultRandomGenerator>::new(seed);
    ShortintEngine::with_thread_local_mut(|engine| {
        *engine = ShortintEngine::new_from_seeder(&mut deterministic_seeder);
    });
}

use fhem_core::operations::EncryptedBatch;
use fhem_core::{
    decrypt_ciphertext, encrypt_batch, encrypt_batch_base64, generate_keys, homomorphic_count,
    homomorphic_sum, KeyConfig,
};

#[test]
fn plaintext_and_ciphertext_agree() {
    let keys = generate_keys(&KeyConfig::default()).expect("key generation");
    let values = [1u32];
    let EncryptedBatch { ciphertexts, stats } =
        encrypt_batch(&values, &keys).expect("encryption batch");

    assert_eq!(stats.count, values.len());
    assert!(stats.total_bytes > 0);

    let sum_ct = homomorphic_sum(&ciphertexts, &keys).expect("sum ciphertext");
    let decrypted_sum = decrypt_ciphertext(&sum_ct, &keys).expect("decrypt sum");
    assert_eq!(decrypted_sum, values.iter().copied().sum::<u32>());

    let count_ct = homomorphic_count(&ciphertexts, &keys).expect("count ciphertext");
    let decrypted_count = decrypt_ciphertext(&count_ct, &keys).expect("decrypt count");
    assert_eq!(decrypted_count, values.len() as u32);
}

#[test]
fn deterministic_ciphertexts_for_identical_inputs() {
    let keys = generate_keys(&KeyConfig::default()).expect("key generation");
    let (first_ciphertexts, _) = encrypt_batch_base64(&[99u32], &keys).expect("first encryption");
    let (second_ciphertexts, _) = encrypt_batch_base64(&[99u32], &keys).expect("second encryption");

    assert_eq!(first_ciphertexts, second_ciphertexts);
}

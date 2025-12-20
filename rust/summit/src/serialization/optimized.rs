pub enum CompressionAlgorithm {
    None,
    Gzip,
    Zstd,
}

pub struct OptimizedCodec {
    pub compression: CompressionAlgorithm,
    pub precomputed_size: Option<usize>,
}

impl OptimizedCodec {
    pub fn new(compression: CompressionAlgorithm) -> Self {
        Self {
            compression,
            precomputed_size: None,
        }
    }
}

pub enum IsolationLevel {
    ReadUncommitted,
    ReadCommitted,
    RepeatableRead,
    Serializable,
}

pub struct StorageOp {
    pub key: String,
    pub value: Vec<u8>,
    pub is_write: bool,
}

pub struct StorageTransaction {
    pub operations: Vec<StorageOp>,
    pub isolation_level: IsolationLevel,
}

impl StorageTransaction {
    pub fn new(isolation_level: IsolationLevel) -> Self {
        Self {
            operations: Vec::new(),
            isolation_level,
        }
    }
}

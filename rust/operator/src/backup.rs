use std::sync::Arc;

pub trait BackupStorage: Send + Sync {
    fn store_backup(&self, data: &[u8]) -> anyhow::Result<()>;
}

pub struct BackupSchedule {
    pub cron_expression: String,
}

pub struct BackupManager {
    pub storage: Arc<dyn BackupStorage>,
    pub schedule: BackupSchedule,
}

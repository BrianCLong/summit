use std::fs::{File, OpenOptions};
use std::io::{BufReader, Write};
use std::path::{Path, PathBuf};

use parking_lot::Mutex;
use serde_json::Deserializer;
use thiserror::Error;

use crate::events::EventEnvelope;
use crate::types::ComplianceReceipt;

#[derive(Debug, Error)]
pub enum StoreError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),
}

#[derive(Debug)]
pub struct EventStore {
    path: PathBuf,
    writer: Mutex<File>,
}

impl EventStore {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, StoreError> {
        let path = path.as_ref().to_path_buf();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .read(true)
            .open(&path)?;
        Ok(Self {
            path,
            writer: Mutex::new(file),
        })
    }

    pub fn append(&self, event: &EventEnvelope) -> Result<(), StoreError> {
        let mut writer = self.writer.lock();
        serde_json::to_writer(&mut *writer, event)?;
        writer.write_all(b"\n")?;
        writer.flush()?;
        Ok(())
    }

    pub fn load(&self) -> Result<Vec<EventEnvelope>, StoreError> {
        Self::read_from_path(&self.path)
    }

    pub fn read_from_path<P: AsRef<Path>>(path: P) -> Result<Vec<EventEnvelope>, StoreError> {
        let path = path.as_ref();
        if !path.exists() {
            return Ok(Vec::new());
        }
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let stream = Deserializer::from_reader(reader).into_iter::<EventEnvelope>();
        let mut events = Vec::new();
        for event in stream {
            events.push(event?);
        }
        Ok(events)
    }

    pub fn path(&self) -> &Path {
        &self.path
    }
}

#[derive(Debug)]
pub struct ReceiptStore {
    dir: PathBuf,
}

impl ReceiptStore {
    pub fn new<P: AsRef<Path>>(dir: P) -> Result<Self, StoreError> {
        let dir = dir.as_ref().to_path_buf();
        std::fs::create_dir_all(&dir)?;
        Ok(Self { dir })
    }

    pub fn write(&self, receipt: &ComplianceReceipt) -> Result<PathBuf, StoreError> {
        let path = self.dir.join(format!("{}.json", receipt.lease_id));
        let file = OpenOptions::new()
            .create(true)
            .truncate(true)
            .write(true)
            .open(&path)?;
        serde_json::to_writer_pretty(std::io::BufWriter::new(file), receipt)?;
        Ok(path)
    }

    pub fn list(&self) -> Result<Vec<ComplianceReceipt>, StoreError> {
        let mut receipts = Vec::new();
        if !self.dir.exists() {
            return Ok(receipts);
        }
        for entry in std::fs::read_dir(&self.dir)? {
            let entry = entry?;
            if entry.file_type()?.is_file() {
                let file = File::open(entry.path())?;
                let reader = BufReader::new(file);
                receipts.push(serde_json::from_reader(reader)?);
            }
        }
        Ok(receipts)
    }

    pub fn dir(&self) -> &Path {
        &self.dir
    }
}

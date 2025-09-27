use crate::{AuditLog, JoinEvent, SjaConfig, SjaOperator};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use tokio::task::JoinHandle;

pub struct SjaService {
    sender: mpsc::Sender<JoinEvent>,
    alerts: Arc<Mutex<mpsc::Receiver<crate::AlertEnvelope>>>,
    audit_log: Arc<Mutex<AuditLog>>,
    worker: JoinHandle<()>,
}

impl SjaService {
    pub fn start(config: SjaConfig) -> Self {
        let (tx, mut rx) = mpsc::channel(1024);
        let (alert_tx, alert_rx) = mpsc::channel(1024);
        let audit_log = Arc::new(Mutex::new(AuditLog::default()));
        let mut operator = SjaOperator::with_audit(config, audit_log.clone());
        let worker = tokio::spawn(async move {
            while let Some(event) = rx.recv().await {
                let alerts = operator.process_event(event);
                for alert in alerts {
                    if alert_tx.send(alert).await.is_err() {
                        break;
                    }
                }
            }
        });
        Self {
            sender: tx,
            alerts: Arc::new(Mutex::new(alert_rx)),
            audit_log,
            worker,
        }
    }

    pub async fn submit(&self, event: JoinEvent) {
        let _ = self.sender.send(event).await;
    }

    pub async fn recv_alert(&self) -> Option<crate::AlertEnvelope> {
        let mut rx = self.alerts.lock().await;
        rx.recv().await
    }

    pub async fn try_recv_alert(&self) -> Option<crate::AlertEnvelope> {
        let mut rx = self.alerts.lock().await;
        rx.try_recv().ok()
    }

    pub fn audit_log(&self) -> Arc<Mutex<AuditLog>> {
        self.audit_log.clone()
    }

    pub async fn shutdown(self) {
        drop(self.sender);
        {
            let mut rx = self.alerts.lock().await;
            rx.close();
        }
        self.worker.abort();
        let _ = self.worker.await;
    }
}

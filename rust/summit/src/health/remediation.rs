use std::pin::Pin;
use std::future::Future;
use anyhow::Result;

pub enum RemediationAction {
    RestartService,
    FailoverNode,
    ScaleResource,
    Custom(Box<dyn Fn() -> Pin<Box<dyn Future<Output = Result<()>> + Send >> + Send + Sync>),
}

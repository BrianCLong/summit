use std::env;
use std::net::SocketAddr;

use axum::serve;
use crkre::api::{router, ApiState};
use crkre::{CrkreService, SystemTimeProvider};
use tokio::net::TcpListener;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("info".parse()?))
        .init();

    let port = env::var("CRKRE_PORT").unwrap_or_else(|_| "8080".to_string());
    let port: u16 = port.parse().unwrap_or(8080);

    let service = CrkreService::new(SystemTimeProvider::default());
    let state = ApiState { service };
    let app = router(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("listening on {addr}");

    let listener = TcpListener::bind(addr).await?;
    serve(listener, app).await?;

    Ok(())
}

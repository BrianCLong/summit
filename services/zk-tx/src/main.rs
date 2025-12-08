use std::net::SocketAddr;

use axum::Router;
use tokio::net::TcpListener;
use tracing_subscriber::{fmt, EnvFilter};
use zk_tx::build_router;

#[tokio::main]
async fn main() {
    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    fmt()
        .with_env_filter(env_filter)
        .with_target(false)
        .compact()
        .init();

    let app: Router = build_router();

    let addr: SocketAddr = "0.0.0.0:8080".parse().expect("invalid bind address");
    let listener = TcpListener::bind(addr)
        .await
        .expect("failed to bind zk-tx listener");

    tracing::info!(target: "zk_tx_startup", %addr, "zk-tx ready");

    axum::serve(listener, app.into_make_service())
        .await
        .expect("server failed");
}

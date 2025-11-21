use anyhow::Context;
use kkp::{app::AppConfig, build_router};
use tokio::signal;
use tracing_subscriber::{fmt, EnvFilter};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .with_target(false)
        .init();

    let config = AppConfig::from_env().context("load proxy configuration")?;
    let state = config.build_state().await?;
    let listener = tokio::net::TcpListener::bind(&config.listen_addr).await?;

    tracing::info!(addr = %config.listen_addr, "listening");
    axum::serve(listener, build_router(state))
        .with_graceful_shutdown(shutdown())
        .await?;

    Ok(())
}

async fn shutdown() {
    let ctrl_c = async {
        signal::ctrl_c().await.expect("failed to listen for ctrl_c");
    };

    #[cfg(unix)]
    let terminate = async {
        use tokio::signal::unix::{signal, SignalKind};
        let mut term = signal(SignalKind::terminate()).expect("failed to install SIGTERM handler");
        term.recv().await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}

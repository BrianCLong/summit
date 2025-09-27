use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ProxyError {
    #[error("policy denied request: {0}")]
    PolicyDenied(String),
    #[error("invalid token: {0}")]
    InvalidToken(String),
    #[error("kms backend error: {0}")]
    Kms(String),
    #[error("envelope malformed: {0}")]
    Envelope(String),
    #[error("internal error: {0}")]
    Internal(String),
}

#[derive(Serialize)]
struct ErrorBody<'a> {
    error: &'a str,
    message: &'a str,
}

impl IntoResponse for ProxyError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match &self {
            ProxyError::PolicyDenied(msg) => (StatusCode::FORBIDDEN, msg.as_str()),
            ProxyError::InvalidToken(msg) => (StatusCode::UNAUTHORIZED, msg.as_str()),
            ProxyError::Kms(msg) | ProxyError::Envelope(msg) => {
                (StatusCode::BAD_REQUEST, msg.as_str())
            }
            ProxyError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg.as_str()),
        };
        let body = ErrorBody {
            error: match &self {
                ProxyError::PolicyDenied(_) => "policy_denied",
                ProxyError::InvalidToken(_) => "invalid_token",
                ProxyError::Kms(_) => "kms_error",
                ProxyError::Envelope(_) => "envelope_error",
                ProxyError::Internal(_) => "internal_error",
            },
            message,
        };
        (status, Json(body)).into_response()
    }
}

impl From<anyhow::Error> for ProxyError {
    fn from(err: anyhow::Error) -> Self {
        ProxyError::Internal(err.to_string())
    }
}

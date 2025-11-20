use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use safejoin::{
    CreateSessionRequest, CreateSessionResponse, RegisterRequest, RegisterResponse, SessionError,
    SessionResult, SessionStore, UploadRequest,
};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    store: SessionStore,
}

#[post("/sessions")]
async fn create_session(
    state: web::Data<AppState>,
    payload: web::Json<CreateSessionRequest>,
) -> Result<web::Json<CreateSessionResponse>, SessionError> {
    Ok(web::Json(state.store.handle_create(payload.into_inner())))
}

#[post("/sessions/{session_id}/register")]
async fn register(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    payload: web::Json<RegisterRequest>,
) -> Result<web::Json<RegisterResponse>, SessionError> {
    let session_id = path.into_inner();
    let response = state.store.register(session_id, payload.into_inner())?;
    Ok(web::Json(response))
}

#[derive(Deserialize)]
struct PeerQuery {
    participant_id: String,
}

#[get("/sessions/{session_id}/peer")]
async fn peer(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    query: web::Query<PeerQuery>,
) -> Result<web::Json<RegisterResponse>, SessionError> {
    let session_id = path.into_inner();
    let key = state.store.peer_key(session_id, &query.participant_id)?;
    Ok(web::Json(RegisterResponse {
        session_id,
        peer_public_key: Some(key),
    }))
}

#[post("/sessions/{session_id}/upload")]
async fn upload(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
    payload: web::Json<UploadRequest>,
) -> Result<impl Responder, SessionError> {
    let session_id = path.into_inner();
    state.store.upload(session_id, payload.into_inner())?;
    Ok(HttpResponse::Accepted().finish())
}

#[get("/sessions/{session_id}/result")]
async fn result(
    state: web::Data<AppState>,
    path: web::Path<Uuid>,
) -> Result<web::Json<SessionResult>, SessionError> {
    let session_id = path.into_inner();
    let result = state.store.result(session_id)?;
    Ok(web::Json(result))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    let store = SessionStore::default();
    let app_state = AppState { store };

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(app_state.clone()))
            .service(create_session)
            .service(register)
            .service(peer)
            .service(upload)
            .service(result)
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}

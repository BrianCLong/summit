#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::{Manager, WindowUrl};
use tauri_plugin_store::{PluginBuilder, StoreBuilder};

#[derive(Deserialize)]
pub struct PolicyInput { pub subject: serde_json::Value, pub action: String, pub resource: serde_json::Value, pub context: serde_json::Value }

#[derive(Serialize)]
pub struct PolicyResult { pub allow: bool, pub reason: String }

#[tauri::command]
pub async fn policy_eval(input: PolicyInput) -> Result<PolicyResult, String> {
    // TODO: call OPA sidecar / wasmtime policy / local rules
    Ok(PolicyResult { allow: true, reason: "native allow (stub)".into() })
}

#[derive(Deserialize)]
pub struct StageEvent { pub evt: String, pub payload: serde_json::Value }

#[tauri::command]
pub async fn stage_event(event: StageEvent, app: tauri::AppHandle) -> Result<(), String> {
    // Broadcast to all windows
    app.emit_all("stage://event", &event).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn secure_store_set(key: String, value: String) -> Result<(), String> {
    // TODO: store via keyring or encrypted file
    Ok(())
}

#[tauri::command]
pub async fn secure_store_get(key: String) -> Result<Option<String>, String> {
    // TODO: retrieve from keyring or encrypted file
    Ok(None)
}

#[tauri::command]
pub async fn secure_store_del(key: String) -> Result<(), String> {
    // TODO: delete from keyring or encrypted file
    Ok(())
}

#[tauri::command]
pub async fn open_audience(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(w) = app.get_window("audience") {
    w.show().map_err(|e| e.to_string())?;
    w.set_focus().map_err(|e| e.to_string())?;
    return Ok(());
  }
  tauri::WindowBuilder::new(&app, "audience", WindowUrl::App("index.html#/audience".into()))
    .title("CompanyOS Audience")
    .build()
    .map_err(|e| e.to_string())?;
  Ok(())
}

fn main() {
  tauri::Builder::default()
    .plugin(PluginBuilder::default().build())
    .invoke_handler(tauri::generate_handler![
      policy_eval,
      stage_event,
      secure_store_set,
      secure_store_get,
      secure_store_del,
      open_audience
    ])
    .run(tauri::generate_context!()) 
    .expect("error while running tauri application");
}
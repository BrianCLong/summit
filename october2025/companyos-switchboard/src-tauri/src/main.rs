#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::{Manager};

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_devtools::init())
    .setup(|app| {
      #[cfg(debug_assertions)]
      app.handle().plugin(tauri_plugin_devtools::init())?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

use keyring::Entry;

pub fn set_secret(name: &str, value: &str) -> Result<(), String> {
  let svc = "companyos";
  Entry::new(svc, name).map_err(|e| e.to_string())?.set_password(value).map_err(|e| e.to_string())
}

pub fn get_secret(name: &str) -> Result<Option<String>, String> {
  let svc = "companyos";
  match Entry::new(svc, name).map_err(|e| e.to_string())?.get_password() {
    Ok(v) => Ok(Some(v)),
    Err(keyring::Error::NoEntry) => Ok(None),
    Err(e) => Err(e.to_string())
  }
}
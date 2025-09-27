use std::time::SystemTime;

#[cfg(test)]
use std::sync::{Arc, Mutex};

pub trait TimeProvider: Send + Sync + Clone + 'static {
    fn now(&self) -> SystemTime;
}

#[derive(Clone, Default)]
pub struct SystemTimeProvider;

impl TimeProvider for SystemTimeProvider {
    fn now(&self) -> SystemTime {
        SystemTime::now()
    }
}

#[cfg(test)]
#[derive(Clone)]
pub struct MockTimeProvider {
    inner: Arc<Mutex<SystemTime>>,
}

#[cfg(test)]
impl MockTimeProvider {
    pub fn new(start: SystemTime) -> Self {
        Self {
            inner: Arc::new(Mutex::new(start)),
        }
    }

    pub fn advance(&self, duration: std::time::Duration) {
        let mut guard = self.inner.lock().expect("mock time poisoned");
        *guard = guard.checked_add(duration).expect("time overflow");
    }
}

#[cfg(test)]
impl TimeProvider for MockTimeProvider {
    fn now(&self) -> SystemTime {
        *self.inner.lock().expect("mock time poisoned")
    }
}

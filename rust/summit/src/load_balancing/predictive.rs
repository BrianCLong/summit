pub struct TimeSeriesData {
    pub data_points: Vec<(i64, f64)>,
}

pub trait LoadPredictor: Send + Sync {
    fn predict_load(&self) -> f64;
}

pub struct PredictiveBalancer {
    pub historical_data: TimeSeriesData,
    pub predictor: Box<dyn LoadPredictor>,
}

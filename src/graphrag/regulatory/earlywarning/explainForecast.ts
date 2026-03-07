export function explainForecast(forecast: any, analogs: any[]) {
  return {
    ...forecast,
    topDrivers: [],
    evidenceIds: ["EVD-REWS-LEAD-001"],
    analogs
  };
}

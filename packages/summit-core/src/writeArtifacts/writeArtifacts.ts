import type { RejectionDetail, RejectionReport } from "./rejectionReport.types";

export function makeAcceptedReport(
  writeset_id: string,
  system_time: string
): RejectionReport {
  return {
    writeset_id,
    system_time,
    accepted: true,
    details: [],
  };
}

export function makeRejectedReport(
  writeset_id: string,
  system_time: string,
  details: RejectionDetail[]
): RejectionReport {
  return {
    writeset_id,
    system_time,
    accepted: false,
    details,
  };
}

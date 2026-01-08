import { ExportOptions } from "../types";

export const exportDashboard = (dashboardId: string, options: ExportOptions): Promise<void> => {
  console.log("Exporting dashboard", dashboardId, options);
  return Promise.resolve();
};

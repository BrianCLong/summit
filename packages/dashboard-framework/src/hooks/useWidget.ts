import { useDashboardStore } from "../store";
import { Widget } from "../types";

export function useWidget(widgetId: string): Widget | null {
  const store = useDashboardStore();
  return store.getWidget(widgetId);
}

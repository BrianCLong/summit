import { useCallback, useMemo } from 'react';
import { useDashboardStore } from '../store';
import { Widget, WidgetConfig } from '../types';

export function useWidget(widgetId: string) {
  const store = useDashboardStore();

  const widget = useMemo(() => {
    return store.getWidget(widgetId);
  }, [store, widgetId]);

  const updateConfig = useCallback((config: Partial<WidgetConfig>) => {
    if (widget) {
      store.updateWidget(widgetId, {
        config: { ...widget.config, ...config },
      });
    }
  }, [widget, widgetId, store]);

  const updateTitle = useCallback((title: string) => {
    store.updateWidget(widgetId, { title });
  }, [widgetId, store]);

  const updateLayout = useCallback((layout: Partial<Widget['layout']>) => {
    store.updateWidgetLayout(widgetId, layout);
  }, [widgetId, store]);

  const duplicate = useCallback(() => {
    return store.duplicateWidget(widgetId);
  }, [widgetId, store]);

  const remove = useCallback(() => {
    store.deleteWidget(widgetId);
  }, [widgetId, store]);

  return {
    widget,
    updateConfig,
    updateTitle,
    updateLayout,
    duplicate,
    remove,
    isSelected: store.selectedWidgets.has(widgetId),
    select: () => store.selectWidget(widgetId),
    deselect: () => store.deselectWidget(widgetId),
  };
}

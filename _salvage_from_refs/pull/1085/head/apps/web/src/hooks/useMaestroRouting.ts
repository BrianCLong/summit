// =============================================
// File: apps/web/src/hooks/useMaestroRouting.ts
// =============================================
import { useMutation, useQuery } from '@tanstack/react-query';
import { maestroApi, RouteExecuteResponse, RoutePreviewResponse } from '../lib/maestroApi';

export function useRoutePreview(task: string, enabled: boolean) {
  return useQuery<RoutePreviewResponse>({
    queryKey: ['maestro', 'routePreview', task],
    queryFn: () => maestroApi.routePreview(task),
    enabled: enabled && Boolean(task?.trim()),
  });
}

export function useRouteExecute() {
  return useMutation<RouteExecuteResponse, Error, { task: string; selection: string[] }>(
    {
      mutationFn: ({ task, selection }) => maestroApi.routeExecute(task, selection),
    }
  );
}

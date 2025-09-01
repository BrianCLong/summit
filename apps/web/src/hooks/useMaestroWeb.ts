// =============================================
// File: apps/web/src/hooks/useMaestroWeb.ts
// =============================================
import { useMutation, useQuery } from '@tanstack/react-query';
import { maestroApi, OrchestrateWebResponse, WebInterfacesResponse } from '../lib/maestroApi';

export function useWebInterfaces() {
  return useQuery<WebInterfacesResponse>({
    queryKey: ['maestro', 'webInterfaces'],
    queryFn: () => maestroApi.webInterfaces(),
  });
}

export function useOrchestrateWeb() {
  return useMutation<OrchestrateWebResponse, Error, { task: string; interfaces: string[] }>(
    {
      mutationFn: ({ task, interfaces }) => maestroApi.orchestrateWeb(task, interfaces),
    }
  );
}

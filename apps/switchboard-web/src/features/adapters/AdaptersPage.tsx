import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchAdapters, performAdapterAction } from "./api";
import { Adapter, AdapterActionPayload } from "./types";
import { AdapterAction, AdapterCard } from "./components/AdapterCard";
import { DualControlPrompt } from "./components/DualControlPrompt";

interface AdapterErrorState {
  message?: string;
  policyErrors?: string[];
  verificationErrors?: string[];
}

interface PendingAction {
  adapter: Adapter;
  action: AdapterAction;
}

export const AdaptersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["adapters"], queryFn: fetchAdapters });
  const [errorState, setErrorState] = useState<Record<string, AdapterErrorState>>({});
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [receipts, setReceipts] = useState<Record<string, string | undefined>>({});

  const adapters = useMemo(() => data?.adapters ?? [], [data]);

  const mutation = useMutation({
    mutationFn: ({
      adapterId,
      action,
      payload,
    }: {
      adapterId: string;
      action: AdapterAction;
      payload?: AdapterActionPayload;
    }) => performAdapterAction(adapterId, action, payload),
    onSuccess: (result) => {
      queryClient.setQueryData(["adapters"], (previous: { adapters: Adapter[] } | undefined) => {
        if (!previous) {
          return previous;
        }

        return {
          adapters: previous.adapters.map((item) =>
            item.id === result.adapter.id ? result.adapter : item
          ),
        };
      });

      setErrorState((current) => ({ ...current, [result.adapter.id]: {} }));
      if (result.receipt?.url) {
        setReceipts((current) => ({ ...current, [result.adapter.id]: result.receipt?.url }));
      }
    },
    onError: (error: unknown, variables) => {
      const policyErrors = (error as { policyErrors?: string[] })?.policyErrors;
      const verificationErrors = (error as { verificationErrors?: string[] })?.verificationErrors;

      setErrorState((current) => ({
        ...current,
        [variables.adapterId]: {
          message: (error as Error).message,
          policyErrors,
          verificationErrors,
        },
      }));
    },
  });

  const triggerAction = (adapter: Adapter, action: AdapterAction) => {
    if (adapter.highPrivilege && action !== "verify") {
      setPendingAction({ adapter, action });
      return;
    }

    mutation.mutate({ adapterId: adapter.id, action });
  };

  const confirmDualControl = (options: { approver: string; justification: string }) => {
    if (!pendingAction) return;
    const { adapter, action } = pendingAction;
    const payload: AdapterActionPayload = {
      dualControl: options,
    };
    mutation.mutate({ adapterId: adapter.id, action, payload });
    setPendingAction(null);
  };

  const isBusy = mutation.isPending;

  return (
    <section>
      {isLoading ? <div className="loading-row">Loading adapters…</div> : null}
      {!isLoading && adapters.length === 0 ? (
        <div className="empty-state">
          <p>
            No adapters installed yet. Install one to start routing workloads through Switchboard.
          </p>
        </div>
      ) : null}

      <div className="adapters-grid">
        {adapters.map((adapter) => {
          const adapterError = errorState[adapter.id];
          const receiptUrl = receipts[adapter.id] ?? adapter.receipts?.[0]?.url;
          return (
            <AdapterCard
              key={adapter.id}
              adapter={adapter}
              isBusy={isBusy}
              onAction={(action) => triggerAction(adapter, action)}
              errorMessage={adapterError?.message}
              policyErrors={adapterError?.policyErrors ?? adapter.policyErrors}
              verificationErrors={adapterError?.verificationErrors ?? adapter.verificationErrors}
              receiptUrl={receiptUrl}
            />
          );
        })}
      </div>

      {pendingAction ? (
        <DualControlPrompt
          adapter={pendingAction.adapter}
          action={pendingAction.action}
          onCancel={() => setPendingAction(null)}
          onConfirm={confirmDualControl}
        />
      ) : null}
    </section>
  );
};

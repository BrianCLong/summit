"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptersPage = void 0;
const react_1 = __importStar(require("react"));
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("./api");
const AdapterCard_1 = require("./components/AdapterCard");
const DualControlPrompt_1 = require("./components/DualControlPrompt");
const AdaptersPage = () => {
    const queryClient = (0, react_query_1.useQueryClient)();
    const { data, isLoading } = (0, react_query_1.useQuery)({ queryKey: ['adapters'], queryFn: api_1.fetchAdapters });
    const [errorState, setErrorState] = (0, react_1.useState)({});
    const [pendingAction, setPendingAction] = (0, react_1.useState)(null);
    const [receipts, setReceipts] = (0, react_1.useState)({});
    const adapters = (0, react_1.useMemo)(() => data?.adapters ?? [], [data]);
    const mutation = (0, react_query_1.useMutation)({
        mutationFn: ({ adapterId, action, payload }) => (0, api_1.performAdapterAction)(adapterId, action, payload),
        onSuccess: (result) => {
            queryClient.setQueryData(['adapters'], (previous) => {
                if (!previous) {
                    return previous;
                }
                return {
                    adapters: previous.adapters.map((item) => item.id === result.adapter.id ? result.adapter : item),
                };
            });
            setErrorState((current) => ({ ...current, [result.adapter.id]: {} }));
            if (result.receipt?.url) {
                setReceipts((current) => ({ ...current, [result.adapter.id]: result.receipt?.url }));
            }
        },
        onError: (error, variables) => {
            const policyErrors = error?.policyErrors;
            const verificationErrors = error?.verificationErrors;
            setErrorState((current) => ({
                ...current,
                [variables.adapterId]: {
                    message: error.message,
                    policyErrors,
                    verificationErrors,
                },
            }));
        },
    });
    const triggerAction = (adapter, action) => {
        if (adapter.highPrivilege && action !== 'verify') {
            setPendingAction({ adapter, action });
            return;
        }
        mutation.mutate({ adapterId: adapter.id, action });
    };
    const confirmDualControl = (options) => {
        if (!pendingAction)
            return;
        const { adapter, action } = pendingAction;
        const payload = {
            dualControl: options,
        };
        mutation.mutate({ adapterId: adapter.id, action, payload });
        setPendingAction(null);
    };
    const isBusy = mutation.isPending;
    return (<section>
      {isLoading ? <div className="loading-row">Loading adapters…</div> : null}
      {!isLoading && adapters.length === 0 ? (<div className="empty-state">
          <p>No adapters installed yet. Install one to start routing workloads through Switchboard.</p>
        </div>) : null}

      <div className="adapters-grid">
        {adapters.map((adapter) => {
            const adapterError = errorState[adapter.id];
            const receiptUrl = receipts[adapter.id] ?? adapter.receipts?.[0]?.url;
            return (<AdapterCard_1.AdapterCard key={adapter.id} adapter={adapter} isBusy={isBusy} onAction={(action) => triggerAction(adapter, action)} errorMessage={adapterError?.message} policyErrors={adapterError?.policyErrors ?? adapter.policyErrors} verificationErrors={adapterError?.verificationErrors ?? adapter.verificationErrors} receiptUrl={receiptUrl}/>);
        })}
      </div>

      {pendingAction ? (<DualControlPrompt_1.DualControlPrompt adapter={pendingAction.adapter} action={pendingAction.action} onCancel={() => setPendingAction(null)} onConfirm={confirmDualControl}/>) : null}
    </section>);
};
exports.AdaptersPage = AdaptersPage;

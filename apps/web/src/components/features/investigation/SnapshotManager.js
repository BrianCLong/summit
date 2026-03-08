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
exports.SnapshotManager = SnapshotManager;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importStar(require("react"));
const react_2 = require("@apollo/client/react");
const client_1 = require("@apollo/client");
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const lucide_react_1 = require("lucide-react");
const date_fns_1 = require("date-fns");
// Types (should be in types/index.ts but adding here for now if not present)
// interface InvestigationSnapshot {
//   id: string
//   investigationId: string
//   data: any
//   snapshotLabel: string
//   createdAt: string
//   createdBy: string
// }
const GET_SNAPSHOTS = (0, client_1.gql) `
  query GetInvestigationSnapshots($investigationId: ID!) {
    investigationSnapshots(investigationId: $investigationId) {
      id
      investigationId
      data
      snapshotLabel
      createdAt
      createdBy
    }
  }
`;
const CREATE_SNAPSHOT = (0, client_1.gql) `
  mutation CreateInvestigationSnapshot($investigationId: ID!, $label: String) {
    createInvestigationSnapshot(investigationId: $investigationId, label: $label) {
      id
      createdAt
      snapshotLabel
    }
  }
`;
function SnapshotManager({ investigationId, onClose }) {
    const { data, loading, error, refetch } = (0, react_2.useQuery)(GET_SNAPSHOTS, {
        variables: { investigationId },
        fetchPolicy: 'cache-and-network',
    });
    const [createSnapshot, { loading: creating }] = (0, react_2.useMutation)(CREATE_SNAPSHOT, {
        onCompleted: () => refetch(),
    });
    const [selectedSnapshots, setSelectedSnapshots] = (0, react_1.useState)([]);
    const [viewMode, setViewMode] = (0, react_1.useState)('list');
    const handleCreateSnapshot = () => {
        const label = prompt('Enter a label for this snapshot (optional):');
        createSnapshot({ variables: { investigationId, label: label || 'Manual Snapshot' } });
    };
    const handleToggleSelect = (id) => {
        if (selectedSnapshots.includes(id)) {
            setSelectedSnapshots(prev => prev.filter(sid => sid !== id));
        }
        else {
            if (selectedSnapshots.length < 2) {
                setSelectedSnapshots(prev => [...prev, id]);
            }
            else {
                // Replace the oldest selection
                setSelectedSnapshots(prev => [prev[1], id]);
            }
        }
    };
    const handleCompare = () => {
        if (selectedSnapshots.length === 2) {
            setViewMode('diff');
        }
    };
    if (viewMode === 'diff') {
        const snap1 = data?.investigationSnapshots.find((s) => s.id === selectedSnapshots[0]);
        const snap2 = data?.investigationSnapshots.find((s) => s.id === selectedSnapshots[1]);
        return (<div className="flex flex-col h-full bg-background border rounded-lg shadow-sm">
         <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center">
            <lucide_react_1.ArrowLeftRight className="mr-2 h-5 w-5"/>
            Comparing Snapshots
          </h3>
          <Button_1.Button variant="ghost" size="sm" onClick={() => setViewMode('list')}>
            Back to List
          </Button_1.Button>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-auto">
          <SnapshotView snapshot={snap1}/>
          <SnapshotView snapshot={snap2}/>
        </div>
      </div>);
    }
    return (<div className="flex flex-col h-full bg-background border rounded-lg shadow-sm">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold flex items-center">
          <lucide_react_1.Clock className="mr-2 h-5 w-5"/>
          History & Snapshots
        </h3>
        <Button_1.Button size="sm" onClick={handleCreateSnapshot} disabled={creating}>
          <lucide_react_1.Plus className="mr-2 h-4 w-4"/>
          {creating ? 'Saving...' : 'New Snapshot'}
        </Button_1.Button>
      </div>

      <div className="p-2 border-b bg-muted/20">
        <div className="flex items-center justify-between px-2">
            <span className="text-sm text-muted-foreground">
                {selectedSnapshots.length} selected
            </span>
            <Button_1.Button size="sm" variant="default" disabled={selectedSnapshots.length !== 2} onClick={handleCompare}>
                Compare Selected
            </Button_1.Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <div className="text-center p-4">Loading snapshots...</div>}
        {error && <div className="text-red-500 p-4">Error: {error.message}</div>}

        {!loading && data?.investigationSnapshots.length === 0 && (<div className="text-center text-muted-foreground p-8">
            No snapshots found. Create one to track changes.
          </div>)}

        {data?.investigationSnapshots.map((snap) => (<Card_1.Card key={snap.id} className={`p-3 cursor-pointer transition-colors ${selectedSnapshots.includes(snap.id) ? 'border-primary ring-1 ring-primary' : 'hover:bg-accent'}`} onClick={() => handleToggleSelect(snap.id)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{snap.snapshotLabel || 'Untitled Snapshot'}</div>
                <div className="text-xs text-muted-foreground">
                  {(0, date_fns_1.format)(new Date(snap.createdAt), 'MMM d, yyyy HH:mm:ss')} • {snap.createdBy}
                </div>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {snap.id.substring(0, 8)}
              </div>
            </div>
          </Card_1.Card>))}
      </div>
    </div>);
}
function SnapshotView({ snapshot }) {
    if (!snapshot)
        return <div>Snapshot not found</div>;
    return (<div className="border rounded p-4 h-full overflow-auto bg-card">
            <div className="mb-4 pb-2 border-b">
                <h4 className="font-semibold">{snapshot.snapshotLabel}</h4>
                <div className="text-xs text-muted-foreground">
                    {(0, date_fns_1.format)(new Date(snapshot.createdAt), 'PPpp')}
                </div>
            </div>
            <pre className="text-xs overflow-auto whitespace-pre-wrap font-mono">
                {JSON.stringify(snapshot.data, null, 2)}
            </pre>
        </div>);
}

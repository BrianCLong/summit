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
const react_1 = __importStar(require("react"));
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const Alert_1 = require("@/components/ui/Alert");
const DemoControlPage = () => {
    const [status, setStatus] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [lastAction, setLastAction] = (0, react_1.useState)(null);
    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/demo/status');
            const data = await res.json();
            setStatus(data);
        }
        catch (e) {
            console.error(e);
            setStatus({ status: 'error', mode: 'unknown' });
        }
    };
    (0, react_1.useEffect)(() => {
        fetchStatus();
    }, []);
    const handleAction = async (action) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/demo/${action}`, { method: 'POST' });
            const data = await res.json();
            setLastAction(`Success: ${JSON.stringify(data)}`);
        }
        catch (e) {
            setLastAction(`Error: ${e}`);
        }
        finally {
            setLoading(false);
            fetchStatus();
        }
    };
    return (<div className="container mx-auto p-8 max-w-2xl">
      <Card_1.Card>
        <Card_1.CardHeader>
          <Card_1.CardTitle>Demo Control</Card_1.CardTitle>
          <Card_1.CardDescription>Manage the demo environment</Card_1.CardDescription>
        </Card_1.CardHeader>
        <Card_1.CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded">
            <span className="font-semibold">Current Status</span>
            <div className="flex gap-2">
                <span className={`px-2 py-1 rounded text-sm ${status?.status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {status?.status || 'Loading...'}
                </span>
                <span className="px-2 py-1 rounded text-sm bg-blue-100 text-blue-800">
                    Mode: {status?.mode || '...'}
                </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button_1.Button onClick={() => handleAction('seed')} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
              {loading ? 'Processing...' : 'Seed Demo Data'}
            </Button_1.Button>
            <Button_1.Button onClick={() => handleAction('reset')} variant="destructive" disabled={loading} className="w-full">
              {loading ? 'Processing...' : 'Reset Environment'}
            </Button_1.Button>
          </div>

          <div className="pt-4 border-t">
              <Button_1.Button variant="outline" className="w-full" onClick={() => window.location.href = '/cases'}>
                  Go to Cases
              </Button_1.Button>
          </div>

          {lastAction && (<Alert_1.Alert className="mt-4">
              <Alert_1.AlertTitle>Result</Alert_1.AlertTitle>
              <Alert_1.AlertDescription>{lastAction}</Alert_1.AlertDescription>
            </Alert_1.Alert>)}
        </Card_1.CardContent>
      </Card_1.Card>
    </div>);
};
exports.default = DemoControlPage;

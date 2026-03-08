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
exports.default = IngestionPage;
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const Table_1 = require("@/components/ui/Table");
function IngestionPage() {
    const [pipelines, setPipelines] = (0, react_1.useState)([]);
    const [dlq, setDlq] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        fetch('/api/ingestion/pipelines').then(res => res.json()).then(setPipelines);
        fetch('/api/ingestion/dlq').then(res => res.json()).then(setDlq);
    }, []);
    const runPipeline = async (key) => {
        // Demo config
        const config = {
            key,
            tenantId: 'demo-tenant',
            name: 'Demo Run',
            source: { type: 'file', config: { path: './demo.csv' } },
            stages: ['raw', 'normalize', 'enrich', 'index']
        };
        await fetch(`/api/ingestion/pipelines/${key}/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        alert('Pipeline started!');
    };
    return (<div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Data Ingestion & Knowledge Fabric</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle>Pipelines</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <Table_1.Table>
              <Table_1.TableHeader>
                <Table_1.TableRow>
                  <Table_1.TableHead>Name</Table_1.TableHead>
                  <Table_1.TableHead>Type</Table_1.TableHead>
                  <Table_1.TableHead>Action</Table_1.TableHead>
                </Table_1.TableRow>
              </Table_1.TableHeader>
              <Table_1.TableBody>
                {pipelines.map(p => (<Table_1.TableRow key={p.key}>
                    <Table_1.TableCell>{p.name}</Table_1.TableCell>
                    <Table_1.TableCell>{p.type}</Table_1.TableCell>
                    <Table_1.TableCell>
                      <Button_1.Button onClick={() => runPipeline(p.key)} size="sm">Run Now</Button_1.Button>
                    </Table_1.TableCell>
                  </Table_1.TableRow>))}
              </Table_1.TableBody>
            </Table_1.Table>
          </Card_1.CardContent>
        </Card_1.Card>

        <Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle>Dead Letter Queue (DLQ)</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <Table_1.Table>
              <Table_1.TableHeader>
                <Table_1.TableRow>
                  <Table_1.TableHead>Pipeline</Table_1.TableHead>
                  <Table_1.TableHead>Stage</Table_1.TableHead>
                  <Table_1.TableHead>Reason</Table_1.TableHead>
                </Table_1.TableRow>
              </Table_1.TableHeader>
              <Table_1.TableBody>
                {dlq.map(r => (<Table_1.TableRow key={r.id}>
                    <Table_1.TableCell>{r.pipeline_key}</Table_1.TableCell>
                    <Table_1.TableCell>{r.stage}</Table_1.TableCell>
                    <Table_1.TableCell className="text-red-500">{r.reason}</Table_1.TableCell>
                  </Table_1.TableRow>))}
              </Table_1.TableBody>
            </Table_1.Table>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>
    </div>);
}

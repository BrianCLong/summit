"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DecisionLog;
const react_1 = __importDefault(require("react"));
const Card_1 = require("@/components/ui/Card");
const Table_1 = require("@/components/ui/Table");
const Badge_1 = require("@/components/ui/Badge");
function DecisionLog({ plan }) {
    if (!plan)
        return <div>No plan selected.</div>;
    const risks = plan.risks || [];
    // Flatten mitigations to simulate decisions
    const decisions = risks.flatMap((risk) => (risk.mitigationStrategies || []).map((mit) => ({
        decision: `Mitigate ${risk.name}: ${mit.description}`,
        type: 'RISK_MITIGATION',
        owner: mit.owner,
        date: mit.deadline,
        status: mit.status
    })));
    return (<Card_1.Card>
      <Card_1.CardHeader>
        <Card_1.CardTitle>Decision Log & Trade-off Ledger</Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent>
        <Table_1.Table>
          <Table_1.TableHeader>
            <Table_1.TableRow>
              <Table_1.TableHead>Decision</Table_1.TableHead>
              <Table_1.TableHead>Type</Table_1.TableHead>
              <Table_1.TableHead>Owner</Table_1.TableHead>
              <Table_1.TableHead>Date</Table_1.TableHead>
              <Table_1.TableHead>Status</Table_1.TableHead>
            </Table_1.TableRow>
          </Table_1.TableHeader>
          <Table_1.TableBody>
             {decisions.length === 0 ? (<Table_1.TableRow>
                  <Table_1.TableCell colSpan={5} className="text-center text-muted-foreground">No decisions recorded.</Table_1.TableCell>
                </Table_1.TableRow>) : (decisions.map((dec, idx) => (<Table_1.TableRow key={idx}>
                    <Table_1.TableCell>{dec.decision}</Table_1.TableCell>
                    <Table_1.TableCell>{dec.type}</Table_1.TableCell>
                    <Table_1.TableCell>{dec.owner}</Table_1.TableCell>
                    <Table_1.TableCell>{dec.date ? new Date(dec.date).toLocaleDateString() : 'N/A'}</Table_1.TableCell>
                    <Table_1.TableCell>
                        <Badge_1.Badge variant="outline">{dec.status}</Badge_1.Badge>
                    </Table_1.TableCell>
                    </Table_1.TableRow>)))}
          </Table_1.TableBody>
        </Table_1.Table>
      </Card_1.CardContent>
    </Card_1.Card>);
}

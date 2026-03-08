"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CommitmentsRegister;
const react_1 = __importDefault(require("react"));
const Card_1 = require("@/components/ui/Card");
const Table_1 = require("@/components/ui/Table");
const Badge_1 = require("@/components/ui/Badge");
function CommitmentsRegister({ plan }) {
    if (!plan)
        return <div>No plan selected.</div>;
    const commitments = plan.initiatives || [];
    return (<Card_1.Card>
      <Card_1.CardHeader>
        <Card_1.CardTitle>Commitments Register</Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent>
        <Table_1.Table>
          <Table_1.TableHeader>
            <Table_1.TableRow>
              <Table_1.TableHead>Commitment (Initiative)</Table_1.TableHead>
              <Table_1.TableHead>Owner</Table_1.TableHead>
              <Table_1.TableHead>Due Date</Table_1.TableHead>
              <Table_1.TableHead>Priority</Table_1.TableHead>
              <Table_1.TableHead>Status</Table_1.TableHead>
            </Table_1.TableRow>
          </Table_1.TableHeader>
          <Table_1.TableBody>
            {commitments.length === 0 ? (<Table_1.TableRow>
                  <Table_1.TableCell colSpan={5} className="text-center text-muted-foreground">No commitments found.</Table_1.TableCell>
                </Table_1.TableRow>) : (commitments.map((init) => (<Table_1.TableRow key={init.id}>
                    <Table_1.TableCell className="font-medium">{init.name}</Table_1.TableCell>
                    <Table_1.TableCell>{init.owner || (init.assignedTo ? init.assignedTo.join(', ') : 'Unassigned')}</Table_1.TableCell>
                    <Table_1.TableCell>{init.endDate ? new Date(init.endDate).toLocaleDateString() : 'N/A'}</Table_1.TableCell>
                    <Table_1.TableCell>
                        <Badge_1.Badge variant="outline">{init.priority || 'N/A'}</Badge_1.Badge>
                    </Table_1.TableCell>
                    <Table_1.TableCell>
                         <Badge_1.Badge variant={init.status === 'COMPLETED' ? 'default' : 'secondary'}>{init.status}</Badge_1.Badge>
                    </Table_1.TableCell>
                    </Table_1.TableRow>)))}
          </Table_1.TableBody>
        </Table_1.Table>
      </Card_1.CardContent>
    </Card_1.Card>);
}

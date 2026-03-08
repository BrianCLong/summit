"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithAnalystData = void 0;
const react_1 = __importDefault(require("react"));
const Table_1 = require("../Table");
const tokens_1 = require("@/theme/tokens");
const rows = [
    { id: 'A-1992', name: 'J. Alvarez', role: 'Lead Analyst', status: 'Active', alerts: 12 },
    { id: 'A-2001', name: 'R. Smith', role: 'Responder', status: 'Active', alerts: 7 },
    { id: 'A-2122', name: 'L. Chen', role: 'Reviewer', status: 'Paused', alerts: 2 },
    { id: 'A-2188', name: 'M. Adeyemi', role: 'Responder', status: 'Blocked', alerts: 0 },
];
const meta = {
    title: 'Design System/Table',
    component: Table_1.Table,
};
exports.default = meta;
exports.WithAnalystData = {
    render: () => (<div style={{
            padding: (0, tokens_1.tokenVar)('ds-space-md'),
            boxShadow: 'var(--ds-shadow-sm)',
            borderRadius: (0, tokens_1.tokenVar)('ds-radius-lg'),
        }}>
      <Table_1.Table>
        <Table_1.TableCaption>Active mission staffing</Table_1.TableCaption>
        <Table_1.TableHeader>
          <Table_1.TableRow>
            <Table_1.TableHead>ID</Table_1.TableHead>
            <Table_1.TableHead>Analyst</Table_1.TableHead>
            <Table_1.TableHead>Role</Table_1.TableHead>
            <Table_1.TableHead>Status</Table_1.TableHead>
            <Table_1.TableHead className="text-right">Open alerts</Table_1.TableHead>
          </Table_1.TableRow>
        </Table_1.TableHeader>
        <Table_1.TableBody>
          {rows.map(row => (<Table_1.TableRow key={row.id}>
              <Table_1.TableCell className="font-medium">{row.id}</Table_1.TableCell>
              <Table_1.TableCell>{row.name}</Table_1.TableCell>
              <Table_1.TableCell>{row.role}</Table_1.TableCell>
              <Table_1.TableCell>{row.status}</Table_1.TableCell>
              <Table_1.TableCell className="text-right">{row.alerts}</Table_1.TableCell>
            </Table_1.TableRow>))}
        </Table_1.TableBody>
      </Table_1.Table>
    </div>),
};
